import { NextResponse } from 'next/server';
import { RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID, supabase } from '@/lib/supabase';
import { evaluateFraudRisk } from '@/lib/fraudRisk';
import { validateTableSession, getOrCreateTableSession } from '@/lib/tableSession';

// In-memory idempotency cache (TTL: 5 minutes)
const idempotencyStore = new Map<string, { order: any; expiresAt: number }>();

function checkIdempotency(key?: string) {
  if (!key) return null;
  const entry = idempotencyStore.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.order;
  }
  return null;
}

function storeIdempotency(key: string, order: any) {
  if (!key) return;
  idempotencyStore.set(key, {
    order,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      restaurant_id,
      dish_ids,
      dish_names,
      items_detail,
      total_amount,
      subtotal,
      tax_amount,
      delivery_fee,
      discount_amount,
      coupon_code,
      split_count,
      table_number,
      order_type = 'dine_in',
      customer_name = 'Guest',
      customer_phone = '',
      delivery_address = '',
      payment_method = 'cash',
      payment_status = 'pending',
      notes = '',
      waiter_id,
      waiter_name,
      session_token,
      idempotency_key,
      device_fingerprint,
    } = body;

    // ── Idempotency Protection ─────────────────────────────────────────────
    if (idempotency_key) {
      const existing = checkIdempotency(idempotency_key);
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }

    if (!dish_ids?.length || !total_amount) {
      return NextResponse.json({ error: 'Missing dishes or total amount' }, { status: 400 });
    }

    const effectiveRestaurantId = restaurant_id || DEFAULT_RESTAURANT_ID;
    const tableNum = table_number ? Number(table_number) : null;

    if (order_type === 'dine_in' && (!tableNum || tableNum < 1)) {
      return NextResponse.json({ error: 'Please specify a valid table number for dine-in orders' }, { status: 400 });
    }

    if (order_type === 'delivery' && !delivery_address?.trim()) {
      return NextResponse.json({ error: 'Delivery address is required for delivery orders' }, { status: 400 });
    }

    // ── Dine-In Session & Table State Validation ───────────────────────────
    let tableSession = null;
    let tableStatus: string | null = null;
    let existingOrders: any[] = [];

    if (order_type === 'dine_in' && tableNum) {
      // 1. Check Table State
      const { data: tableData } = await supabase
        .from(RESTAURANT_TABLES.restaurantTables)
        .select('status')
        .eq('restaurant_id', effectiveRestaurantId)
        .eq('table_number', tableNum)
        .single();

      if (tableData?.status) {
        tableStatus = tableData.status;
        const invalidStatuses = ['cleaning', 'closed', 'blocked'];
        if (invalidStatuses.includes(tableData.status.toLowerCase())) {
          return NextResponse.json(
            {
              error: `Table ${tableNum} is currently ${tableData.status}. Please request table assignment from reception.`,
              table_status: tableData.status,
            },
            { status: 400 }
          );
        }
      }

      // 2. Validate / Resume Table Session
      if (session_token) {
        const sessionValidation = await validateTableSession(session_token, tableNum, effectiveRestaurantId);
        if (sessionValidation.valid && sessionValidation.session) {
          tableSession = sessionValidation.session;
        }
      }

      // If no valid session token yet, create temporary session
      if (!tableSession) {
        tableSession = await getOrCreateTableSession({
          restaurantId: effectiveRestaurantId,
          tableNumber: tableNum,
          deviceFingerprint: device_fingerprint,
          customerName: customer_name,
          customerPhone: customer_phone,
        });
      }

      // 3. Fetch recent orders for this table to detect velocity/spam
      const { data: recentOrders } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .select('id, status, created_at, total_amount')
        .eq('restaurant_id', effectiveRestaurantId)
        .eq('table_number', tableNum)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentOrders) {
        existingOrders = recentOrders;
      }
    }

    // ── Rule-Based Fraud / Remote Abuse Risk Engine ─────────────────────────
    const parsedItems = (items_detail || []).map((i: any) => ({
      id: String(i.id || ''),
      name: String(i.name || ''),
      qty: Number(i.qty || 1),
      price: Number(i.price || 0),
    }));

    const riskEvaluation = evaluateFraudRisk({
      order_type,
      restaurant_id: effectiveRestaurantId,
      table_number: tableNum,
      total_amount: Number(total_amount),
      items: parsedItems,
      session: tableSession,
      table_status: tableStatus,
      existing_table_orders: existingOrders,
      device_fingerprint,
    });

    if (riskEvaluation.is_blocked) {
      return NextResponse.json(
        {
          error: riskEvaluation.block_message || 'Order could not be processed due to table verification limits.',
          risk_level: riskEvaluation.risk_level,
          reasons: riskEvaluation.reasons,
        },
        { status: 400 }
      );
    }

    // ── Determination of Initial Order Lifecycle State ──────────────────────
    // CRITICAL: Unverified dine-in orders start in 'pending_verification'
    // They are NEVER automatically dispatched to the kitchen display!
    let initialStatus = 'placed';
    let initialVerificationStatus = 'CONFIRMED';

    if (order_type === 'dine_in') {
      if (riskEvaluation.risk_level === 'HIGH') {
        initialStatus = 'pending_verification';
        initialVerificationStatus = 'HOLD';
      } else if (riskEvaluation.requires_verification) {
        initialStatus = 'pending_verification';
        initialVerificationStatus = 'PENDING_TABLE_VERIFICATION';
      } else {
        initialStatus = 'placed';
        initialVerificationStatus = 'CONFIRMED';
      }
    }

    const orderNumber = `PRX-${Date.now().toString().slice(-6)}`;

    // Rich V2 order payload
    const richOrderPayload: Record<string, unknown> = {
      restaurant_id: effectiveRestaurantId,
      order_number: orderNumber,
      order_type,
      dish_ids,
      dish_names,
      items_detail: items_detail || [],
      total_amount: Number(total_amount),
      subtotal: subtotal ? Number(subtotal) : Number(total_amount) / 1.05,
      tax_amount: tax_amount ? Number(tax_amount) : Number(total_amount) * 0.05,
      delivery_fee: delivery_fee ? Number(delivery_fee) : 0,
      discount_amount: discount_amount ? Number(discount_amount) : 0,
      coupon_code: coupon_code || null,
      split_count: split_count ?? 1,
      status: initialStatus,
      verification_status: initialVerificationStatus,
      risk_level: riskEvaluation.risk_level,
      risk_reasons: riskEvaluation.reasons,
      session_id: tableSession?.session_token || tableSession?.id || null,
      idempotency_key: idempotency_key || null,
      payment_status,
      payment_method,
      customer_name: customer_name || 'Guest',
      customer_phone: customer_phone || null,
      delivery_address: delivery_address || null,
      notes: notes || null,
      waiter_id: waiter_id || null,
      waiter_name: waiter_name || null,
    };

    if (tableNum) {
      richOrderPayload.table_number = tableNum;
    }

    // Attempt rich insert first
    let { data, error } = await supabase
      .from(RESTAURANT_TABLES.orders)
      .insert(richOrderPayload)
      .select()
      .single();

    // Fallback if custom columns don't exist yet in Supabase schema
    if (error && (error.message.includes('column') || error.code === '42703')) {
      console.warn('[Orders] Extended column insert failed, using fallback insert:', error.message);
      const fallbackPayload: Record<string, unknown> = {
        dish_ids,
        dish_names,
        total_amount: Number(total_amount),
        split_count: split_count ?? 1,
        status: initialStatus,
      };
      if (tableNum) {
        fallbackPayload.table_number = tableNum;
      }

      const fallbackResult = await supabase
        .from(RESTAURANT_TABLES.orders)
        .insert(fallbackPayload)
        .select()
        .single();

      data = fallbackResult.data;
      error = fallbackResult.error;

      // Augment returned data with verification attributes
      if (data) {
        data.order_number = orderNumber;
        data.order_type = order_type;
        data.verification_status = initialVerificationStatus;
        data.risk_level = riskEvaluation.risk_level;
        data.risk_reasons = riskEvaluation.reasons;
        data.session_id = tableSession?.session_token;
      }
    }

    if (error) {
      console.error('Order creation failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Save to idempotency store
    if (idempotency_key && data) {
      storeIdempotency(idempotency_key, data);
    }

    // If order was auto-confirmed, mark table as occupied
    if (initialStatus === 'placed' && tableNum) {
      await supabase
        .from(RESTAURANT_TABLES.restaurantTables)
        .update({ status: 'occupied' })
        .eq('table_number', tableNum)
        .eq('restaurant_id', effectiveRestaurantId);
    }

    // Audit log entry for tracking
    try {
      await supabase.from('audit_logs').insert({
        restaurant_id: effectiveRestaurantId,
        user_name: customer_name || 'Guest Patron',
        user_role: 'customer',
        action: initialStatus === 'pending_verification' ? 'verification_requested' : 'order_created',
        entity: 'orders',
        entity_id: String(data?.id || orderNumber),
        details: `Dine-in Order ${orderNumber} for Table ${tableNum || 'N/A'} (Status: ${initialVerificationStatus}, Risk: ${riskEvaluation.risk_level})`,
        created_at: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json(
      {
        ...data,
        verification_status: initialVerificationStatus,
        risk_level: riskEvaluation.risk_level,
        requires_verification: riskEvaluation.requires_verification,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Order route error:', err);
    return NextResponse.json({ error: err?.message || 'Internal order error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');
    const tableParam = url.searchParams.get('table');
    const verificationParam = url.searchParams.get('verification_status');

    let query = supabase
      .from(RESTAURANT_TABLES.orders)
      .select('*')
      .order('created_at', { ascending: false });

    if (statusParam) {
      const statuses = statusParam.split(',');
      query = query.in('status', statuses);
    }

    if (verificationParam) {
      const vStatuses = verificationParam.split(',');
      query = query.in('verification_status', vStatuses);
    }

    if (tableParam) {
      query = query.eq('table_number', Number(tableParam));
    }

    const { data, error } = await query.limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { order_id, status, payment_status, waiter_id, waiter_name, verification_status } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    const validStatuses = ['pending_verification', 'placed', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updatePayload.status = status;
    if (verification_status) updatePayload.verification_status = verification_status;
    if (payment_status) updatePayload.payment_status = payment_status;
    if (waiter_id) updatePayload.waiter_id = waiter_id;
    if (waiter_name) updatePayload.waiter_name = waiter_name;

    const { data, error } = await supabase
      .from(RESTAURANT_TABLES.orders)
      .update(updatePayload)
      .eq('id', order_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update order' }, { status: 500 });
  }
}
