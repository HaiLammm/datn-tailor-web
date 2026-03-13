"use client";

/**
 * CartBadge - Story 3.1: Cart State Management
 * Cart icon with item count badge. Opens CartDrawer on click.
 * Must be "use client" to read Zustand store.
 */

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { CartDrawer } from "./CartDrawer";

export function CartBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const count = useCartStore((state) => state.items.length);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label={`Giỏ hàng${count > 0 ? ` (${count} sản phẩm)` : ""}`}
        className="relative p-2 text-[#1A2B4C] hover:text-[#D4AF37] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        {/* Shopping cart icon */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>

        {/* Badge count */}
        {count > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center px-1"
            aria-hidden="true"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      <CartDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
