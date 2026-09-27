import { NextResponse } from 'next/server';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID } from '@/lib/supabase';
import { validateTableSession } from '@/lib/tableSession';

/**
 * GET /api/orders/bill?session_token=xxx&restaurant_id=xxx
 * Returns the running bill for an active dine-in table session.
 * Security: session_token is validated; a customer can only see their own session.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionToken = url.searchParams.get('session_token');
    const tableNumber = url.searchParams.get('table') ? Number(url.searchParams.get('table')) : undefined;
    const restaurantId = url.searchParams.get('restaurant_id') || DEFAULT_RESTAURANT_ID;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing session_token' }, { status: 400 });
    }

    // Validate session ownership
    const validation = await validateTableSession(sessionToken, tableNumber, restaurantId);
    if (!validation.valid || !validation.session) {
      return NextResponse.json({ error: validation.reason || 'Invalid or expired session' }, { status: 403 });
    }

    const session = validation.session;

    // Fetch all orders belonging to this session
    const { data: orders, error } = await supabase
      .from(RESTAURANT_TABLES.orders)
      .select('id, order_number, dish_names, items_detail, total_amount, subtotal, tax_amount, discount_amount, status, payment_status, created_at')
      .eq('session_id', sessionToken)
      .order('created_at', { ascending: true });

    if (error) {
      // Fallback: query by table_number if session_id column doesn't exist yet
      const { data: fallbackOrders, error: fallbackError } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .select('id, order_number, dish_names, items_detail, total_amount, subtotal, tax_amount, discount_amount, status, payment_status, created_at')
        .eq('table_number', session.table_number)
        .not('status', 'in', '("cancelled","completed")')
        .order('created_at', { ascending: true });

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }

      return buildBillResponse(session, fallbackOrders || []);
    }

    return buildBillResponse(session, orders || []);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch running bill' }, { status: 500 });
  }
}

function buildBillResponse(session: any, orders: any[]) {
  // Filter out cancelled orders
  const activeOrders = orders.filter((o) => o.status !== 'cancelled');

  // Compute totals server-side (never trust client)
  const subtotal = activeOrders.reduce((sum, o) => sum + Number(o.subtotal || o.total_amount || 0), 0);
  const tax = activeOrders.reduce((sum, o) => sum + Number(o.tax_amount || 0), 0);
  const discount = activeOrders.reduce((sum, o) => sum + Number(o.discount_amount || 0), 0);
  const grandTotal = Math.max(0, subtotal + tax - discount);
  const paidAmount = Number(session.bill_paid_amount || 0);
  const remaining = Math.max(0, grandTotal - paidAmount);

  return NextResponse.json({
    session: {
      id: session.id,
      session_token: session.session_token,
      table_number: session.table_number,
      customer_name: session.customer_name,
      status: session.status,
      bill_payment_status: session.bill_payment_status || 'pending',
      bill_paid_amount: paidAmount,
    },
    orders: activeOrders.map((o) => ({
      id: o.id,
      order_number: o.order_number || `#${String(o.id).slice(0, 8).toUpperCase()}`,
      dish_names: o.dish_names || [],
      items_detail: o.items_detail || [],
      subtotal: Number(o.subtotal || o.total_amount || 0),
      tax_amount: Number(o.tax_amount || 0),
      discount_amount: Number(o.discount_amount || 0),
      status: o.status,
      payment_status: o.payment_status,
      created_at: o.created_at,
    })),
    bill: {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      grand_total: parseFloat(grandTotal.toFixed(2)),
      paid_amount: parseFloat(paidAmount.toFixed(2)),
      remaining: parseFloat(remaining.toFixed(2)),
      order_count: activeOrders.length,
    },
  });
}
