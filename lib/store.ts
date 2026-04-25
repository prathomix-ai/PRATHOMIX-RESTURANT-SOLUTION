import { create } from 'zustand';
import type { Dish } from './supabase';

export type CartItem = Dish & { qty: number };

interface CartStore {
  items: CartItem[];
  addItem:    (dish: Dish) => void;
  removeItem: (id: string) => void;
  updateQty:  (id: string, qty: number) => void;
  clearCart:  () => void;
  total:      () => number;
  count:      () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (dish) => set((s) => {
    const exists = s.items.find((i) => i.id === dish.id);
    if (exists) {
      return { items: s.items.map((i) => i.id === dish.id ? { ...i, qty: i.qty + 1 } : i) };
    }
    return { items: [...s.items, { ...dish, qty: 1 }] };
  }),

  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  updateQty: (id, qty) => set((s) => ({
    items: qty < 1
      ? s.items.filter((i) => i.id !== id)
      : s.items.map((i) => i.id === id ? { ...i, qty } : i),
  })),

  clearCart: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),

  count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
}));
