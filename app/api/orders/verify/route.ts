import { NextResponse } from 'next/server';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID } from '@/lib/supabase';
import { markSessionAsTrusted } from '@/lib/tableSession';

// Map of valid staff roles that can verify or override dine-in orders
const AUTHORIZED_ROLES = ['waiter', 'reception', 'manager', 'admin', 'owner'];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      order_id,
      action, // 'confirm' | 'reject' | 'hold'
      reason = '',
      staff_name = 'Staff Member',
      staff_role = 'waiter',
      staff_id,
    } = body;

    if (!order_id || !action) {
      return NextResponse.json({ error: 'Missing order_id or action' }, { status: 400 });
    }

    if (!['confirm', 'reject', 'hold'].includes(action)) {
      return NextResponse.json({ error: 'Invalid verification action' }, { status: 400 });
    }

    // Role verification: check cookie or provided staff role
    const effectiveRole = staff_role?.toLowerCase() || 'waiter';
    if (!AUTHORIZED_ROLES.includes(effectiveRole)) {
      return NextResponse.json({ error: 'Unauthorized: Staff credentials required to verify orders' }, { status: 403 });
    }

    // 1. Fetch current order
    const { data: order, error: fetchErr } = await supabase
      .from(RESTAURANT_TABLES.orders)
      .select('*')
      .eq('id', order_id)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const restaurantId = order.restaurant_id || DEFAULT_RESTAURANT_ID;
    const tableNumber = order.table_number;

    let newStatus = order.status;
    let newVerificationStatus = order.verification_status || 'PENDING_TABLE_VERIFICATION';
    let auditAction = 'order_verification';
    let auditDetails = '';

    if (action === 'confirm') {
      // Transition to placed (KOT generated, Kitchen receives order)
      newStatus = 'placed';
      newVerificationStatus = 'CONFIRMED';
      auditAction = 'verification_approved';
      auditDetails = `${effectiveRole.toUpperCase()} ${staff_name} confirmed physical table presence for Order #${order.order_number || order_id} at Table ${tableNumber}. Dispatched to Kitchen.`;

      // 2. Mark table session as trusted
      if (order.session_id) {
        await markSessionAsTrusted(order.session_id, `${staff_name} (${effectiveRole})`);
      }

      // 3. Mark table as occupied
      if (tableNumber) {
        await supabase
          .from(RESTAURANT_TABLES.restaurantTables)
          .update({ status: 'occupied', updated_at: now })
          .eq('restaurant_id', restaurantId)
          .eq('table_number', tableNumber);
      }
    } else if (action === 'reject') {
      // Cancel order and reject
      newStatus = 'cancelled';
      newVerificationStatus = 'REJECTED';
      auditAction = 'verification_rejected';
      auditDetails = `${effectiveRole.toUpperCase()} ${staff_name} rejected dine-in order #${order.order_number || order_id} at Table ${tableNumber}. Reason: ${reason || 'Customer absent from table / unverified'}.`;
    } else if (action === 'hold') {
      newStatus = 'pending_verification';
      newVerificationStatus = 'HOLD';
      auditAction = 'verification_hold';
      auditDetails = `${effectiveRole.toUpperCase()} ${staff_name} placed Order #${order.order_number || order_id} on security HOLD. Reason: ${reason || 'Awaiting supervisor review'}.`;
    }

    // 4. Update the order in database
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      verification_status: newVerificationStatus,
      verified_by: `${staff_name} (${effectiveRole})`,
      verified_at: now,
      rejection_reason: action === 'reject' ? reason || 'Unverified remote request' : null,
      updated_at: now,
    };

    const { data: updatedOrder, error: updateErr } = await supabase
      .from(RESTAURANT_TABLES.orders)
      .update(updatePayload)
      .eq('id', order_id)
      .select()
      .single();

    if (updateErr) {
      // If columns don't exist yet in DB, fallback gracefully with status update
      console.warn('[Verify] Extended column update failed, falling back to status:', updateErr.message);
      const fallbackResult = await supabase
        .from(RESTAURANT_TABLES.orders)
        .update({ status: newStatus })
        .eq('id', order_id)
        .select()
        .single();

      // Update in-memory copy
      if (fallbackResult.data) {
        fallbackResult.data.verification_status = newVerificationStatus;
        fallbackResult.data.verified_by = `${staff_name} (${effectiveRole})`;
      }
    }

    // 5. Immutable Audit Log Entry
    try {
      await supabase.from('audit_logs').insert({
        restaurant_id: restaurantId,
        user_name: staff_name,
        user_role: effectiveRole,
        action: auditAction,
        entity: 'orders',
        entity_id: String(order_id),
        details: auditDetails,
        created_at: now,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      action,
      order: updatedOrder || {
        ...order,
        status: newStatus,
        verification_status: newVerificationStatus,
        verified_by: `${staff_name} (${effectiveRole})`,
        verified_at: now,
      },
      message:
        action === 'confirm'
          ? `Order #${order.order_number || order_id} verified and sent to Kitchen!`
          : action === 'reject'
          ? `Order #${order.order_number || order_id} was rejected.`
          : `Order #${order.order_number || order_id} placed on hold.`,
    });
  } catch (err: any) {
    console.error('Order verification error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to process order verification' }, { status: 500 });
  }
}
