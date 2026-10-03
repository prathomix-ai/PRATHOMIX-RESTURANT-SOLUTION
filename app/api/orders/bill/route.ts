import { NextResponse } from 'next/server';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID } from '@/lib/supabase';
import { validateTableSession } from '@/lib/tableSession';

/**
 * GET /api/orders/bill
 * Parameters:
 *   - order_id: canonical single order ID
 *   - session_token: active dine-in table session token
 *   - table: table number
 *   - restaurant_id: optional tenant ID
 * 
 * Returns canonical bill summary with verified items, subtotal, taxes, grand total, and payment status.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get('order_id') || url.searchParams.get('id');
    const orderNumber = url.searchParams.get('order_number');
    const sessionToken = url.searchParams.get('session_token');
    const tableParam = url.searchParams.get('table');
    const tableNumber = tableParam ? Number(tableParam) : undefined;
    const restaurantId = url.searchParams.get('restaurant_id') || DEFAULT_RESTAURANT_ID;

    // ── CASE 1: Query by specific Order ID or Order Number ────────────────
    if (orderId || orderNumber) {
      let query = supabase
        .from(RESTAURANT_TABLES.orders)
        .select('*');

      if (orderId) {
        query = query.eq('id', orderId);
      } else if (orderNumber) {
        query = query.eq('order_number', orderNumber);
      }

      const { data: order, error } = await query.maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      return buildSingleOrderBillResponse(order);
    }

    // ── CASE 2: Query by Dining Session Token ──────────────────────────────
    if (sessionToken) {
      // Fetch session validation
      const validation = await validateTableSession(sessionToken, tableNumber, restaurantId);
      const session = validation.session;

      // Fetch all orders belonging to this session
      const { data: orders, error } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .select('*')
        .eq('session_id', sessionToken)
        .order('created_at', { ascending: true });

      if (orders && orders.length > 0) {
        return buildSessionBillResponse(session || { session_token: sessionToken, table_number: tableNumber }, orders);
      }

      // Fallback: if session_id matching returned nothing, check table if valid
      if (session?.table_number || tableNumber) {
        const tNum = session?.table_number || tableNumber;
        const { data: tableOrders } = await supabase
          .from(RESTAURANT_TABLES.orders)
          .select('*')
          .eq('table_number', tNum)
          .not('status', 'in', '("cancelled")')
          .order('created_at', { ascending: true })
          .limit(10);

        if (tableOrders && tableOrders.length > 0) {
          return buildSessionBillResponse(session || { session_token: sessionToken, table_number: tNum }, tableOrders);
        }
      }

      if (session) {
        return buildSessionBillResponse(session, []);
      }
    }

    // ── CASE 3: Query by Table Number fallback ─────────────────────────────
    if (tableNumber) {
      const { data: tableOrders, error } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .select('*')
        .eq('table_number', tableNumber)
        .not('status', 'in', '("cancelled")')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (tableOrders && tableOrders.length > 0) {
        return buildSessionBillResponse(
          { table_number: tableNumber, customer_name: tableOrders[0].customer_name || 'Guest' },
          tableOrders
        );
      }

      return NextResponse.json({ error: `No active orders found for Table ${tableNumber}` }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Please provide an order_id, session_token, or table number to view the bill.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Bill API error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch bill' }, { status: 500 });
  }
}

/**
 * Builds canonical bill response for a single order
 */
function buildSingleOrderBillResponse(order: any) {
  const total = Number(order.total_amount) || 0;
  const subtotal = order.subtotal ? Number(order.subtotal) : Math.round((total / 1.05) * 100) / 100;
  const tax = order.tax_amount ? Number(order.tax_amount) : Math.round((total - subtotal) * 100) / 100;
  const discount = Number(order.discount_amount) || 0;
  const deliveryFee = Number(order.delivery_fee) || 0;
  const isPaid = order.payment_status === 'paid';

  // Normalize item details
  let items: any[] = [];
  if (Array.isArray(order.items_detail) && order.items_detail.length > 0) {
    items = order.items_detail.map((i: any) => ({
      name: String(i.name || ''),
      price: Number(i.price) || 0,
      qty: Number(i.qty) || 1,
      total: (Number(i.price) || 0) * (Number(i.qty) || 1),
    }));
  } else if (Array.isArray(order.dish_names) && order.dish_names.length > 0) {
    items = order.dish_names.map((name: string) => {
      const match = name.match(/^(\d+)x\s*(.*)$/);
      const qty = match ? Number(match[1]) : 1;
      const cleanName = match ? match[2] : name;
      return {
        name: cleanName,
        price: items.length > 0 ? Math.round((total / order.dish_names.length) * 100) / 100 : total,
        qty,
        total: total,
      };
    });
  }

  const orderNum = order.order_number || `#${String(order.id).slice(0, 8).toUpperCase()}`;

  return NextResponse.json({
    type: 'single_order',
    order: {
      id: order.id,
      order_number: orderNum,
      order_type: order.order_type || (order.table_number ? 'dine_in' : 'takeaway'),
      table_number: order.table_number || null,
      customer_name: order.customer_name || 'Guest',
      customer_phone: order.customer_phone || null,
      status: order.status,
      payment_status: order.payment_status || 'pending',
      payment_method: order.payment_method || 'cash',
      created_at: order.created_at,
      items,
    },
    bill: {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      delivery_fee: parseFloat(deliveryFee.toFixed(2)),
      grand_total: parseFloat(total.toFixed(2)),
      paid_amount: isPaid ? parseFloat(total.toFixed(2)) : 0,
      remaining: isPaid ? 0 : parseFloat(total.toFixed(2)),
      payment_status: order.payment_status || 'pending',
      is_paid: isPaid,
    },
  });
}

/**
 * Builds canonical bill response for a multi-order running table session
 */
function buildSessionBillResponse(session: any, orders: any[]) {
  const activeOrders = orders.filter((o) => o.status !== 'cancelled');

  let rawSubtotal = 0;
  let rawTax = 0;
  let rawDiscount = 0;
  let grandTotal = 0;

  activeOrders.forEach((o) => {
    const orderTotal = Number(o.total_amount) || 0;
    const orderSub = o.subtotal ? Number(o.subtotal) : Math.round((orderTotal / 1.05) * 100) / 100;
    const orderTax = o.tax_amount ? Number(o.tax_amount) : Math.round((orderTotal - orderSub) * 100) / 100;
    const orderDisc = Number(o.discount_amount) || 0;

    rawSubtotal += orderSub;
    rawTax += orderTax;
    rawDiscount += orderDisc;
    grandTotal += orderTotal;
  });

  const allOrdersPaid = activeOrders.length > 0 && activeOrders.every((o) => o.payment_status === 'paid');
  const sessionPaid = session?.bill_payment_status === 'paid' || allOrdersPaid;
  const paidAmount = sessionPaid ? grandTotal : Number(session?.bill_paid_amount || 0);
  const remaining = Math.max(0, grandTotal - paidAmount);

  return NextResponse.json({
    type: 'session',
    session: {
      id: session?.id,
      session_token: session?.session_token,
      table_number: session?.table_number,
      customer_name: session?.customer_name || 'Guest',
      status: session?.status || 'ACTIVE',
      bill_payment_status: sessionPaid ? 'paid' : (session?.bill_payment_status || 'pending'),
      bill_paid_amount: paidAmount,
    },
    orders: activeOrders.map((o) => {
      let items: any[] = [];
      if (Array.isArray(o.items_detail) && o.items_detail.length > 0) {
        items = o.items_detail.map((i: any) => ({
          name: String(i.name || ''),
          price: Number(i.price) || 0,
          qty: Number(i.qty) || 1,
        }));
      } else if (Array.isArray(o.dish_names)) {
        items = o.dish_names.map((n: string) => ({ name: n, price: Number(o.total_amount) || 0, qty: 1 }));
      }

      return {
        id: o.id,
        order_number: o.order_number || `#${String(o.id).slice(0, 8).toUpperCase()}`,
        items,
        subtotal: Number(o.subtotal || o.total_amount || 0),
        tax_amount: Number(o.tax_amount || 0),
        total_amount: Number(o.total_amount || 0),
        status: o.status,
        payment_status: o.payment_status || 'pending',
        created_at: o.created_at,
      };
    }),
    bill: {
      subtotal: parseFloat(rawSubtotal.toFixed(2)),
      tax: parseFloat(rawTax.toFixed(2)),
      discount: parseFloat(rawDiscount.toFixed(2)),
      grand_total: parseFloat(grandTotal.toFixed(2)),
      paid_amount: parseFloat(paidAmount.toFixed(2)),
      remaining: parseFloat(remaining.toFixed(2)),
      payment_status: sessionPaid ? 'paid' : (remaining === 0 && grandTotal > 0 ? 'paid' : 'pending'),
      is_paid: sessionPaid || (remaining === 0 && grandTotal > 0),
      order_count: activeOrders.length,
    },
  });
}
