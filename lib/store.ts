import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Dish } from './supabase';

export type CartItem = Dish & { qty: number };

interface CartStore {
  items: CartItem[];
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  addItem:    (dish: Dish) => void;
  removeItem: (id: string) => void;
  updateQty:  (id: string, qty: number) => void;
  clearCart:  () => void;
  total:      () => number;
  count:      () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,

      setDrawerOpen: (open) => set({ drawerOpen: open }),
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),

      addItem: (dish) => set((s) => {
        if (!dish || !dish.id) return s;
        const exists = s.items.find((i) => i.id === dish.id);
        if (exists) {
          const nextQty = Math.min(50, exists.qty + 1);
          return { items: s.items.map((i) => (i.id === dish.id ? { ...i, qty: nextQty } : i)) };
        }
        return { items: [...s.items, { ...dish, qty: 1 }] };
      }),

      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      updateQty: (id, qty) => set((s) => {
        const safeQty = Math.max(0, Math.min(50, Math.floor(Number(qty) || 0)));
        return {
          items: safeQty < 1
            ? s.items.filter((i) => i.id !== id)
            : s.items.map((i) => (i.id === id ? { ...i, qty: safeQty } : i)),
        };
      }),

      clearCart: () => set({ items: [] }),

      total: () => Math.round(get().items.reduce((sum, i) => sum + (Number(i.price) || 0) * (i.qty || 1), 0) * 100) / 100,

      count: () => get().items.reduce((sum, i) => sum + (i.qty || 0), 0),
    }),
    {
      name: 'prathomix_cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
