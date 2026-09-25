import { ServingNotification, OrderStatusHistory } from './supabase';

// In-memory notifications store for instant real-time polling and multi-agent coordination
const memoryNotifications: ServingNotification[] = [];
const memoryStatusHistory: OrderStatusHistory[] = [];

export function addServingNotification(notification: Omit<ServingNotification, 'id' | 'created_at'>): ServingNotification {
  const newNotif: ServingNotification = {
    ...notification,
    id: 'notif_' + Math.random().toString(36).slice(2, 10),
    created_at: new Date().toISOString(),
    acknowledged: false,
  };

  memoryNotifications.unshift(newNotif);
  // Keep only the most recent 100 notifications
  if (memoryNotifications.length > 100) {
    memoryNotifications.pop();
  }

  return newNotif;
}

export function getActiveServingNotifications(restaurantId?: string, limit = 20): ServingNotification[] {
  let list = memoryNotifications;
  if (restaurantId) {
    list = list.filter((n) => !n.restaurant_id || n.restaurant_id === restaurantId);
  }
  return list.slice(0, limit);
}

export function acknowledgeNotification(notificationId: string): boolean {
  const found = memoryNotifications.find((n) => n.id === notificationId);
  if (found) {
    found.acknowledged = true;
    return true;
  }
  return false;
}

export function recordOrderStatusHistory(entry: OrderStatusHistory): OrderStatusHistory {
  const record: OrderStatusHistory = {
    ...entry,
    id: entry.id || 'hist_' + Math.random().toString(36).slice(2, 10),
    changed_at: entry.changed_at || new Date().toISOString(),
  };
  memoryStatusHistory.unshift(record);
  if (memoryStatusHistory.length > 200) {
    memoryStatusHistory.pop();
  }
  return record;
}

export function getOrderStatusHistory(orderId: string): OrderStatusHistory[] {
  return memoryStatusHistory.filter((h) => h.order_id === orderId);
}

export function checkPickupDelays(orders: Array<{ id: string; order_number?: string; table_number?: number | null; status: string; ready_at?: string }>, maxMinutes = 5) {
  const now = Date.now();
  const delayedOrders: Array<{ order_id: string; table_number: number; elapsedMinutes: number }> = [];

  for (const ord of orders) {
    if (ord.status === 'ready' && ord.ready_at) {
      const readyTime = new Date(ord.ready_at).getTime();
      const elapsedMinutes = (now - readyTime) / 60000;
      if (elapsedMinutes >= maxMinutes) {
        delayedOrders.push({
          order_id: ord.id,
          table_number: ord.table_number || 0,
          elapsedMinutes: Math.floor(elapsedMinutes),
        });
      }
    }
  }

  return delayedOrders;
}
