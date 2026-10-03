import { NextResponse } from 'next/server';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID } from '@/lib/supabase';
import { validateTableSession } from '@/lib/tableSession';

/**
 * POST /api/orders/pay
 * Pays for either a single canonical order (order_id) or a dine-in table session (session_token).
 * Resilient to database column variations and provides idempotency protection.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      order_id,
      session_token,
      table_number,
      payment_method = 'upi',
      restaurant_id = DEFAULT_RESTAURANT_ID,
      bill_idempotency_key,
    } = body;

    const now = new Date().toISOString();

    // ─────────────────────────────────────────────────────────────────────────
    // CASE 1: DIRECT ORDER PAYMENT (order_id)
    // ─────────────────────────────────────────────────────────────────────────
    if (order_id) {
      const { data: order, error: fetchErr } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .select('*')
        .eq('id', order_id)
        .single();

      if (fetchErr || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (order.payment_status === 'paid') {
        return NextResponse.json({
          success: true,
          already_paid: true,
          paid_amount: Number(order.total_amount),
          order_id: order.id,
        });
      }

      let { data: updatedOrder, error: updateErr } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .update({
          payment_status: 'paid',
          payment_method,
          updated_at: now,
        })
        .eq('id', order_id)
        .select()
        .single();

      // Schema fallback if payment_status column does not exist
      if (updateErr && (updateErr.message?.includes('column') || updateErr.code === '42703')) {
        const fallback = await supabase
          .from(RESTAURANT_TABLES.orders)
          .update({
            updated_at: now,
          })
          .eq('id', order_id)
          .select()
          .single();
        updatedOrder = fallback.data;
        updateErr = fallback.error;
      }

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        paid_amount: Number(order.total_amount),
        order_id: order.id,
        payment_method,
        paid_at: now,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CASE 2: DINE-IN RUNNING BILL PAYMENT (session_token)
    // ─────────────────────────────────────────────────────────────────────────
    if (!session_token) {
      return NextResponse.json({ error: 'Missing order_id or session_token' }, { status: 400 });
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
      try {
        const { data: existingSession } = await supabase
          .from('table_sessions')
          .select('id, status, total_spent')
          .eq('session_token', session_token)
          .single();

        if (existingSession && existingSession.status === 'CLOSED') {
          return NextResponse.json({
            success: true,
            already_paid: true,
            paid_amount: Number(existingSession.total_spent || 0),
          });
        }
      } catch {}
    }

    // 3. Compute grand total server-side from actual orders
    const { data: orders, error: ordersError } = await supabase
      .from(RESTAURANT_TABLES.orders)
      .select('id, total_amount, subtotal, tax_amount, discount_amount, status')
      .eq('session_id', session_token)
      .not('status', 'in', '("cancelled")');

    // Fallback to table_number if session_id column doesn't match
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

    // 4. Update all non-cancelled orders to payment_status=paid
    if (activeOrders.length > 0) {
      const orderIds = activeOrders.map((o) => o.id);
      const { error: batchErr } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .update({ payment_status: 'paid', payment_method, updated_at: now })
        .in('id', orderIds);

      if (batchErr && (batchErr.message?.includes('column') || batchErr.code === '42703')) {
        await supabase
          .from(RESTAURANT_TABLES.orders)
          .update({ updated_at: now })
          .in('id', orderIds);
      }
    }

    // 5. Mark session as paid + closed using standard columns
    try {
      await supabase
        .from('table_sessions')
        .update({
          status: 'CLOSED',
          total_spent: parseFloat(grandTotal.toFixed(2)),
          last_activity_at: now,
        })
        .eq('session_token', session_token);
    } catch {}

    // 6. Mark table as available
    try {
      await supabase
        .from(RESTAURANT_TABLES.restaurantTables)
        .update({ status: 'available' })
        .eq('table_number', session.table_number);
    } catch {}

    // 7. Audit log
    try {
      await supabase.from('audit_logs').insert({
        restaurant_id,
        user_name: session.customer_name || 'Guest',
        user_role: 'customer',
        action: 'bill_paid',
        entity: 'table_sessions',
        entity_id: session.id,
        details: `Table ${session.table_number} bill settled ₹${grandTotal.toFixed(2)} via ${payment_method}`,
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
    console.error('Payment error:', err);
    return NextResponse.json({ error: err?.message || 'Payment failed' }, { status: 500 });
  }
}
