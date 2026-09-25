export type LocalOrder = {
  id: string;
  table_number?: number | null;
  dish_ids: string[];
  dish_names: string[];
  total_amount: number;
  split_count: number;
  status: string;
  created_at: string;
  updated_at?: string;
};

const STORAGE_KEY = 'prathomix_local_orders';

function readOrders(): LocalOrder[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalOrder[]) : [];
  } catch {
    return [];
  }
}

function writeOrders(orders: LocalOrder[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function getLocalOrders() {
  return readOrders();
}

export function addLocalOrder(order: LocalOrder) {
  const orders = readOrders();
  writeOrders([order, ...orders]);
}

export function updateLocalOrderStatus(orderId: string, status: string) {
  const orders = readOrders().map((order) => (
    order.id === orderId
      ? { ...order, status, updated_at: new Date().toISOString() }
      : order
  ));
  writeOrders(orders);
}

export function isLocalOrderId(orderId: string) {
  return orderId.startsWith('local-');
}