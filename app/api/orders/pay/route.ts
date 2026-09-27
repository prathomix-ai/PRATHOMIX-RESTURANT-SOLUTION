import { NextResponse } from 'next/server';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID } from '@/lib/supabase';
import { validateTableSession } from '@/lib/tableSession';

/**
 * POST /api/orders/pay
 * Pays the running bill for a dine-in table session.
 * Idempotent: same bill_idempotency_key will not create duplicate payments.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      session_token,
      table_number,
      payment_method = 'cash',
      restaurant_id = DEFAULT_RESTAURANT_ID,
      bill_idempotency_key,
    } = body;

    if (!session_token) {
      return NextResponse.json({ error: 'Missing session_token' }, { status: 400 });
    }

    // 1. Validate session
    const validation = await validateTableSession(
      session_token,
      table_number ? Number(table_number) : undefined,
      restaurant_id
    );

    if (!validation.valid || !validation.session) {
      return NextResponse.json({ error: validation.reason || 'Invalid session' }, { status: 403 });
    }

    const session = validation.session;

    // 2. Check idempotency — prevent double payment
    if (bill_idempotency_key) {
      const { data: existingSession } = await supabase
        .from('table_sessions')
        .select('bill_payment_status, bill_idempotency_key, bill_paid_amount, bill_paid_at')
        .eq('session_token', session_token)
        .single();

      if (
        existingSession?.bill_idempotency_key === bill_idempotency_key &&
        existingSession?.bill_payment_status === 'paid'
      ) {
        return NextResponse.json({
          success: true,
          already_paid: true,
          paid_at: existingSession.bill_paid_at,
          paid_amount: existingSession.bill_paid_amount,
        });
      }
    }

    // 3. Compute grand total server-side from actual orders
    const { data: orders, error: ordersError } = await supabase
      .from(RESTAURANT_TABLES.orders)
      .select('id, total_amount, subtotal, tax_amount, discount_amount, status')
      .eq('session_id', session_token)
      .not('status', 'in', '("cancelled")');

    // Fallback to table_number if session_id column doesn't exist
    let activeOrders = orders || [];
    if (ordersError || activeOrders.length === 0) {
      const { data: fallbackOrders } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .select('id, total_amount, subtotal, tax_amount, discount_amount, status')
        .eq('table_number', session.table_number)
        .not('status', 'in', '("cancelled","completed")');
      activeOrders = fallbackOrders || [];
    }

    const subtotal = activeOrders.reduce((s, o) => s + Number(o.subtotal || o.total_amount || 0), 0);
    const tax = activeOrders.reduce((s, o) => s + Number(o.tax_amount || 0), 0);
    const discount = activeOrders.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
    const grandTotal = Math.max(0, subtotal + tax - discount);

    const now = new Date().toISOString();

    // 4. Update all non-cancelled orders to payment_status=paid
    if (activeOrders.length > 0) {
      const orderIds = activeOrders.map((o) => o.id);
      await supabase
        .from(RESTAURANT_TABLES.orders)
        .update({ payment_status: 'paid', payment_method, updated_at: now })
        .in('id', orderIds);
    }

    // 5. Mark session as paid + closed
    const sessionUpdatePayload: Record<string, unknown> = {
      bill_payment_status: 'paid',
      bill_paid_amount: parseFloat(grandTotal.toFixed(2)),
      bill_payment_method: payment_method,
      bill_paid_at: now,
      status: 'CLOSED',
      last_activity_at: now,
    };
    if (bill_idempotency_key) {
      sessionUpdatePayload.bill_idempotency_key = bill_idempotency_key;
    }

    await supabase
      .from('table_sessions')
      .update(sessionUpdatePayload)
      .eq('session_token', session_token);

    // 6. Mark table as available
    await supabase
      .from(RESTAURANT_TABLES.restaurantTables)
      .update({ status: 'available' })
      .eq('table_number', session.table_number)
      .eq('restaurant_id', restaurant_id);

    // 7. Audit log
    try {
      await supabase.from('audit_logs').insert({
        restaurant_id,
        user_name: session.customer_name || 'Guest',
        user_role: 'customer',
        action: 'bill_paid',
        entity: 'table_sessions',
        entity_id: session.id,
        details: `Table ${session.table_number} running bill paid ₹${grandTotal.toFixed(2)} via ${payment_method}`,
        created_at: now,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      paid_amount: parseFloat(grandTotal.toFixed(2)),
      payment_method,
      table_number: session.table_number,
      paid_at: now,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Payment failed' }, { status: 500 });
  }
}
