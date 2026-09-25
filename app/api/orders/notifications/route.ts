import { NextResponse } from 'next/server';
import { DEFAULT_RESTAURANT_ID } from '@/lib/supabase';
import {
  getActiveServingNotifications,
  acknowledgeNotification,
  checkPickupDelays,
} from '@/lib/servingNotifications';
import { supabase, RESTAURANT_TABLES } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const restaurantId = url.searchParams.get('restaurant_id') || DEFAULT_RESTAURANT_ID;

    const notifications = getActiveServingNotifications(restaurantId);

    // Also check for pickup delays on any active orders that are 'ready'
    const { data: readyOrders } = await supabase
      .from(RESTAURANT_TABLES.orders)
      .select('id, order_number, table_number, status, ready_at')
      .eq('status', 'ready');

    const delayed = checkPickupDelays(readyOrders || [], 5);

    return NextResponse.json({
      notifications,
      delayed_orders: delayed,
      unread_count: notifications.filter((n) => !n.acknowledged).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { notification_id } = body;

    if (!notification_id) {
      return NextResponse.json({ error: 'Missing notification_id' }, { status: 400 });
    }

    const success = acknowledgeNotification(notification_id);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to acknowledge notification' }, { status: 500 });
  }
}
