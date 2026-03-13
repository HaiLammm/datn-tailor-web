/**
 * Cart Store - Story 3.1: Cart State Management
 * Zustand store with persist middleware for cart state.
 * Pattern follows designStore.ts.
 */

import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";

import type { CartItem, CartStore } from "@/types/cart";

/**
 * Check if an item is a duplicate of an existing cart item.
 * Duplicate = same garment_id + transaction_type + (size for buy | dates for rent)
 */
function isDuplicate(existing: CartItem, newItem: CartItem): boolean {
  if (
    existing.garment_id !== newItem.garment_id ||
    existing.transaction_type !== newItem.transaction_type
  ) {
    return false;
  }
  if (newItem.transaction_type === "buy") {
    return existing.size === newItem.size;
  }
  // rent: compare dates
  return (
    existing.start_date === newItem.start_date &&
    existing.end_date === newItem.end_date
  );
}

export const useCartStore = create<CartStore>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],

        addItem: (item: CartItem) =>
          set(
            (state) => {
              const exists = state.items.some((i) => isDuplicate(i, item));
              if (exists) return state;
              return { items: [...state.items, item] };
            },
            false,
            "addItem"
          ),

        removeItem: (id: string) =>
          set(
            (state) => ({ items: state.items.filter((i) => i.id !== id) }),
            false,
            "removeItem"
          ),

        updateItem: (id: string, updates: Partial<CartItem>) =>
          set(
            (state) => ({
              items: state.items.map((i) =>
                i.id === id ? { ...i, ...updates } : i
              ),
            }),
            false,
            "updateItem"
          ),

        clearCart: () => set({ items: [] }, false, "clearCart"),

        cartCount: () => get().items.length,

        cartTotal: () =>
          get().items.reduce((sum, item) => sum + item.total_price, 0),
      }),
      {
        name: "tailor-cart",
        storage: createJSONStorage(() => localStorage),
      }
    ),
    { name: "CartStore" }
  )
);
