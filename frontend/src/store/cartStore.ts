/**
 * Cart Store - Story 3.1: Cart State Management
 * Zustand store with persist middleware for cart state.
 * Pattern follows designStore.ts.
 */

import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";

import type { CartAppliedVoucher, CartItem, CartStore } from "@/types/cart";

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
  if (newItem.transaction_type === "buy" || newItem.transaction_type === "bespoke") {
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
        appliedVouchers: [],
        measurement_confirmed: false,

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
            (state) => {
              const newItems = state.items.filter((i) => i.id !== id);
              // Story 10.2: Reset measurement_confirmed if no bespoke items remain
              const hasBespoke = newItems.some((i) => i.transaction_type === "bespoke");
              return {
                items: newItems,
                measurement_confirmed: hasBespoke ? state.measurement_confirmed : false,
              };
            },
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

        clearCart: () => set({ items: [], appliedVouchers: [], measurement_confirmed: false }, false, "clearCart"),

        cartCount: () => get().items.length,

        cartTotal: () =>
          get().items.reduce((sum, item) => sum + item.total_price, 0),

        applyVoucher: (voucher: CartAppliedVoucher) =>
          set(
            (state) => {
              if (voucher.visibility === "public") {
                // Public: replace any existing public voucher (max 1 public per order)
                const filtered = state.appliedVouchers.filter(
                  (v) => v.visibility !== "public"
                );
                return { appliedVouchers: [...filtered, voucher] };
              } else {
                // Private: replace if same voucher_id (each code once per order)
                const filtered = state.appliedVouchers.filter(
                  (v) => v.voucher_id !== voucher.voucher_id
                );
                return { appliedVouchers: [...filtered, voucher] };
              }
            },
            false,
            "applyVoucher"
          ),

        removeVoucher: (voucherId: string) =>
          set(
            (state) => ({
              appliedVouchers: state.appliedVouchers.filter(
                (v) => v.voucher_id !== voucherId
              ),
            }),
            false,
            "removeVoucher"
          ),

        clearVouchers: () =>
          set({ appliedVouchers: [] }, false, "clearVouchers"),

        totalDiscount: () =>
          get().appliedVouchers.reduce((sum, v) => sum + v.discount_amount, 0),

        finalTotal: () => {
          const subtotal = get().cartTotal();
          const discount = get().totalDiscount();
          return Math.max(0, subtotal - discount);
        },

        // Story 10.2: Measurement Gate
        setMeasurementConfirmed: (confirmed: boolean) =>
          set({ measurement_confirmed: confirmed }, false, "setMeasurementConfirmed"),

        hasBespokeItems: () =>
          get().items.some((i) => i.transaction_type === "bespoke"),
      }),
      {
        name: "tailor-cart",
        storage: createJSONStorage(() => localStorage),
      }
    ),
    { name: "CartStore" }
  )
);
