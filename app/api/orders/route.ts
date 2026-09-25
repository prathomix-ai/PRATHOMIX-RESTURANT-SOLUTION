import { NextResponse } from 'next/server';
import { RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID, supabase } from '@/lib/supabase';

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
    } = body;

    if (!dish_ids?.length || !total_amount) {
      return NextResponse.json({ error: 'Missing dishes or total amount' }, { status: 400 });
    }

    if (order_type === 'dine_in' && (!table_number || Number(table_number) < 1)) {
      return NextResponse.json({ error: 'Please specify a valid table number for dine-in orders' }, { status: 400 });
    }

    if (order_type === 'delivery' && !delivery_address?.trim()) {
      return NextResponse.json({ error: 'Delivery address is required for delivery orders' }, { status: 400 });
    }

    const orderNumber = `PRX-${Date.now().toString().slice(-6)}`;
    const effectiveRestaurantId = restaurant_id || DEFAULT_RESTAURANT_ID;

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
      status: 'placed',
      payment_status,
      payment_method,
      customer_name: customer_name || 'Guest',
      customer_phone: customer_phone || null,
      delivery_address: delivery_address || null,
      notes: notes || null,
      waiter_id: waiter_id || null,
      waiter_name: waiter_name || null,
    };

    if (table_number) {
      richOrderPayload.table_number = Number(table_number);
    }

    // Attempt rich insert first
    let { data, error } = await supabase
      .from(RESTAURANT_TABLES.orders)
      .insert(richOrderPayload)
      .select()
      .single();

    // Fallback to legacy schema if database has not run v2 migration yet
    if (error && (error.message.includes('column') || error.code === '42703')) {
      console.warn('[Orders] Rich insert failed, attempting legacy schema insert:', error.message);
      const legacyPayload: Record<string, unknown> = {
        dish_ids,
        dish_names,
        total_amount: Number(total_amount),
        split_count: split_count ?? 1,
        status: 'placed',
      };
      if (table_number) {
        legacyPayload.table_number = Number(table_number);
      }

      const legacyResult = await supabase
        .from(RESTAURANT_TABLES.orders)
        .insert(legacyPayload)
        .select()
        .single();

      data = legacyResult.data;
      error = legacyResult.error;
    }

    if (error) {
      console.error('Order creation failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If dine-in order with table, update table status to occupied
    if (table_number) {
      await supabase
        .from(RESTAURANT_TABLES.restaurantTables)
        .update({ status: 'occupied' })
        .eq('table_number', Number(table_number))
        .eq('restaurant_id', effectiveRestaurantId);
    }

    return NextResponse.json(data, { status: 201 });
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

    let query = supabase
      .from(RESTAURANT_TABLES.orders)
      .select('*')
      .order('created_at', { ascending: false });

    if (statusParam) {
      const statuses = statusParam.split(',');
      query = query.in('status', statuses);
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
    const { order_id, status, payment_status, waiter_id, waiter_name } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    const validStatuses = ['placed', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updatePayload.status = status;
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
