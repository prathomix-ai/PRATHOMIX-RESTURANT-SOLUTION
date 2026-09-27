import { NextResponse } from 'next/server';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID, Order } from '@/lib/supabase';
import { verifyQrToken } from '@/lib/qrToken';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import {
  addServingNotification,
  recordOrderStatusHistory,
  getActiveServingNotifications,
  acknowledgeNotification,
} from '@/lib/servingNotifications';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, 'general');
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many serving requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': rateCheck.retryAfterHeader || '60' } }
      );
    }

    const url = new URL(req.url);
    const tableParam = url.searchParams.get('table');
    const restaurantId = url.searchParams.get('restaurant_id') || DEFAULT_RESTAURANT_ID;
    const includeNotifications = url.searchParams.get('notifications') === 'true';

    // Fetch orders that are in the serving pipeline (ready or picked_up)
    let query = supabase
      .from(RESTAURANT_TABLES.orders)
      .select('id, order_number, restaurant_id, table_number, status, priority, ready_at, picked_up_at, picked_up_by, served_at, served_by, dish_names, items_detail, notes, special_instructions, waiter_id, waiter_name, created_at')
      .in('status', ['ready', 'picked_up'])
      .order('ready_at', { ascending: true }); // Oldest ready first

    if (restaurantId) {
      query = query.or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`);
    }

    if (tableParam) {
      query = query.eq('table_number', Number(tableParam));
    }

    const { data: rawOrders, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orders: Order[] = (rawOrders as unknown as Order[]) || [];

    // Optional notifications bundle
    let notifications = undefined;
    if (includeNotifications) {
      notifications = getActiveServingNotifications(restaurantId);
    }

    return NextResponse.json({
      orders,
      total_ready: orders.filter((o) => o.status === 'ready').length,
      total_picked_up: orders.filter((o) => o.status === 'picked_up').length,
      notifications,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch serving queue' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, 'orders');
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many serving action requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': rateCheck.retryAfterHeader || '60' } }
      );
    }

    const body = await req.json();
    const {
      action,
      order_id,
      order_ids,
      table_number,
      waiter_id,
      waiter_name,
      user_role = 'waiter',
      qr_token,
      priority,
      notification_id,
      notes,
    } = body;

    // Handle notification acknowledge
    if (action === 'ack_notification' && notification_id) {
      acknowledgeNotification(notification_id);
      return NextResponse.json({ success: true, acknowledged: true });
    }

    // Role Security Check: Customers can NEVER mutate ready/picked_up/served
    if (user_role === 'customer' || user_role === 'guest') {
      return NextResponse.json(
        { error: 'Unauthorized: Customers are not permitted to change kitchen or serving states.' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION 1: CHEF MARKS ORDER "READY" (PREPARING -> READY)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === 'ready') {
      if (!order_id) {
        return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
      }

      // Fetch current order
      const { data: existingOrder, error: fetchErr } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .select('*')
        .eq('id', order_id)
        .single();

      if (fetchErr || !existingOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (['served', 'completed', 'cancelled'].includes(existingOrder.status)) {
        return NextResponse.json(
          { error: `Cannot mark order in '${existingOrder.status}' status as ready.` },
          { status: 409 }
        );
      }

      const effectivePriority = priority || existingOrder.priority || 'NORMAL';

      const updatePayload: Partial<Order> = {
        status: 'ready',
        priority: effectivePriority,
        ready_at: existingOrder.ready_at || now,
        updated_at: now,
      };

      const { data: updatedOrder, error: updateErr } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .update(updatePayload)
        .eq('id', order_id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      // Record status transition
      recordOrderStatusHistory({
        order_id,
        old_status: existingOrder.status,
        new_status: 'ready',
        changed_by: waiter_name || 'Chef on Duty',
        changed_by_role: user_role === 'admin' ? 'admin' : 'chef',
        changed_at: now,
        metadata: {
          table_number: existingOrder.table_number,
          priority: effectivePriority,
          items_count: existingOrder.dish_names?.length || 0,
        },
      });

      // Emit real-time notification for assigned waiter / floor
      const notif = addServingNotification({
        restaurant_id: existingOrder.restaurant_id || DEFAULT_RESTAURANT_ID,
        order_id,
        order_number: existingOrder.order_number || `#${String(order_id).slice(0, 6)}`,
        table_number: existingOrder.table_number || 0,
        type: 'ORDER_READY',
        message: `Order ${existingOrder.order_number || ''} is ready for Table ${existingOrder.table_number || 'N/A'}.`,
        priority: effectivePriority,
        items_summary: (existingOrder.dish_names || []).join(', ') || 'Dishes ready',
      });

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        notification: notif,
        message: `Order marked as ready for Table ${existingOrder.table_number}`,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION 2: WAITER PICKS UP FOOD (READY -> PICKED_UP)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === 'pickup') {
      if (!order_id) {
        return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
      }

      const { data: existingOrder, error: fetchErr } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .select('*')
        .eq('id', order_id)
        .single();

      if (fetchErr || !existingOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (existingOrder.status !== 'ready' && user_role !== 'admin') {
        return NextResponse.json(
          { error: `Cannot pick up order in '${existingOrder.status}' status. Must be 'ready'.` },
          { status: 400 }
        );
      }

      const updatePayload: Partial<Order> = {
        status: 'picked_up',
        picked_up_at: now,
        picked_up_by: waiter_name || 'Staff Waiter',
        waiter_id: waiter_id || existingOrder.waiter_id,
        waiter_name: waiter_name || existingOrder.waiter_name,
        updated_at: now,
      };

      const { data: updatedOrder, error: updateErr } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .update(updatePayload)
        .eq('id', order_id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      recordOrderStatusHistory({
        order_id,
        old_status: existingOrder.status,
        new_status: 'picked_up',
        changed_by: waiter_name || 'Staff Waiter',
        changed_by_role: 'waiter',
        changed_at: now,
        metadata: {
          table_number: existingOrder.table_number,
          waiter_id,
          waiter_name,
        },
      });

      addServingNotification({
        restaurant_id: existingOrder.restaurant_id || DEFAULT_RESTAURANT_ID,
        order_id,
        order_number: existingOrder.order_number || `#${String(order_id).slice(0, 6)}`,
        table_number: existingOrder.table_number || 0,
        type: 'ORDER_PICKED_UP',
        message: `Order ${existingOrder.order_number || ''} picked up by ${waiter_name || 'waiter'}. En route to Table ${existingOrder.table_number}.`,
        priority: existingOrder.priority || 'NORMAL',
        items_summary: (existingOrder.dish_names || []).join(', '),
      });

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        message: `Order picked up by ${waiter_name || 'waiter'}`,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION 3: WAITER SERVES TABLE (PICKED_UP -> SERVED)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === 'serve') {
      if (!order_id) {
        return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
      }

      const { data: existingOrder, error: fetchErr } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .select('*')
        .eq('id', order_id)
        .single();

      if (fetchErr || !existingOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (['completed', 'cancelled'].includes(existingOrder.status)) {
        return NextResponse.json(
          { error: `Cannot serve order in '${existingOrder.status}' status.` },
          { status: 409 }
        );
      }

      // WRONG TABLE PROTECTION
      // If table_number was supplied by waiter or scanner, verify it matches
      if (table_number !== undefined && table_number !== null) {
        if (Number(table_number) !== Number(existingOrder.table_number)) {
          return NextResponse.json(
            {
              error: `Wrong table! Order #${existingOrder.order_number || order_id} belongs to Table ${existingOrder.table_number}, not Table ${table_number}.`,
              order_table: existingOrder.table_number,
              scanned_table: table_number,
            },
            { status: 400 }
          );
        }
      }

      // OPTIONAL TABLE QR SCAN VERIFICATION
      if (qr_token) {
        const qrVerification = verifyQrToken(
          existingOrder.restaurant_id || DEFAULT_RESTAURANT_ID,
          Number(existingOrder.table_number),
          qr_token
        );

        if (!qrVerification.valid) {
          return NextResponse.json(
            {
              error: `Table QR verification failed: ${qrVerification.reason || 'Invalid QR'}. This order belongs to Table ${existingOrder.table_number}.`,
              order_table: existingOrder.table_number,
            },
            { status: 400 }
          );
        }
      }

      const updatePayload: Partial<Order> = {
        status: 'served',
        served_at: now,
        served_by: waiter_name || 'Staff Waiter',
        updated_at: now,
      };

      const { data: updatedOrder, error: updateErr } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .update(updatePayload)
        .eq('id', order_id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      recordOrderStatusHistory({
        order_id,
        old_status: existingOrder.status,
        new_status: 'served',
        changed_by: waiter_name || 'Staff Waiter',
        changed_by_role: 'waiter',
        changed_at: now,
        metadata: {
          table_number: existingOrder.table_number,
          served_by: waiter_name,
          qr_verified: Boolean(qr_token),
        },
      });

      addServingNotification({
        restaurant_id: existingOrder.restaurant_id || DEFAULT_RESTAURANT_ID,
        order_id,
        order_number: existingOrder.order_number || `#${String(order_id).slice(0, 6)}`,
        table_number: existingOrder.table_number || 0,
        type: 'ORDER_SERVED',
        message: `Order #${existingOrder.order_number || ''} successfully served at Table ${existingOrder.table_number}.`,
        priority: existingOrder.priority || 'NORMAL',
        items_summary: (existingOrder.dish_names || []).join(', '),
      });

      // Audit log entry
      try {
        await supabase.from('audit_logs').insert({
          restaurant_id: existingOrder.restaurant_id || DEFAULT_RESTAURANT_ID,
          user_name: waiter_name || 'Waiter',
          user_role: user_role,
          action: 'order_served',
          entity: 'orders',
          entity_id: String(order_id),
          details: `Order #${existingOrder.order_number || order_id} served at Table ${existingOrder.table_number} by ${waiter_name || 'waiter'}${qr_token ? ' (QR Verified)' : ''}`,
          created_at: now,
        });
      } catch {}

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        message: `Order #${existingOrder.order_number || order_id} served at Table ${existingOrder.table_number}`,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION 4: BATCH SERVE MULTIPLE ORDERS FOR SAME TABLE
    // ─────────────────────────────────────────────────────────────────────────
    if (action === 'batch_serve') {
      if (!Array.isArray(order_ids) || order_ids.length === 0) {
        return NextResponse.json({ error: 'Missing order_ids array' }, { status: 400 });
      }

      const { data: targetOrders, error: fetchErr } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .select('*')
        .in('id', order_ids);

      if (fetchErr || !targetOrders || targetOrders.length === 0) {
        return NextResponse.json({ error: 'No orders found' }, { status: 404 });
      }

      // Wrong table check for batch
      if (table_number !== undefined && table_number !== null) {
        const mismatch = targetOrders.find((o) => Number(o.table_number) !== Number(table_number));
        if (mismatch) {
          return NextResponse.json(
            {
              error: `Table mismatch in batch: Order #${mismatch.order_number || mismatch.id} belongs to Table ${mismatch.table_number}, not Table ${table_number}.`,
            },
            { status: 400 }
          );
        }
      }

      const updatePayload: Partial<Order> = {
        status: 'served',
        served_at: now,
        served_by: waiter_name || 'Staff Waiter',
        updated_at: now,
      };

      await supabase
        .from(RESTAURANT_TABLES.orders)
        .update(updatePayload)
        .in('id', order_ids);

      for (const ord of targetOrders) {
        recordOrderStatusHistory({
          order_id: ord.id,
          old_status: ord.status,
          new_status: 'served',
          changed_by: waiter_name || 'Staff Waiter',
          changed_by_role: 'waiter',
          changed_at: now,
          metadata: {
            table_number: ord.table_number,
            batch_serve: true,
            total_batch: order_ids.length,
          },
        });
      }

      return NextResponse.json({
        success: true,
        served_count: order_ids.length,
        message: `${order_ids.length} orders marked as served for Table ${table_number || targetOrders[0]?.table_number}`,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION 5: SET PRIORITY (NORMAL / HIGH / URGENT)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === 'set_priority') {
      if (!order_id || !priority) {
        return NextResponse.json({ error: 'Missing order_id or priority' }, { status: 400 });
      }

      const { data: updatedOrder, error: updateErr } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .update({ priority, updated_at: now })
        .eq('id', order_id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        message: `Priority set to ${priority}`,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Serving route error:', err);
    return NextResponse.json({ error: err?.message || 'Serving action failed' }, { status: 500 });
  }
}
