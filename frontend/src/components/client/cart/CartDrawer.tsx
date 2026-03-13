"use client";

/**
 * CartDrawer - Story 3.1: Cart State Management
 * Slide-in drawer from right showing cart items with remove and checkout.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/utils/format";
import { useFocusTrap } from "@/utils/useFocusTrap";
import { CartItemRow } from "./CartItemRow";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const cartTotal = useCartStore((state) => state.cartTotal);

  const total = cartTotal();

  const focusTrapRef = useFocusTrap(isOpen);

  // M2: Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
          aria-hidden="true"
          data-testid="cart-backdrop"
        />
      )}

      {/* Drawer */}
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-label="Giỏ hàng"
        aria-modal="true"
        data-testid="cart-drawer"
        className={`fixed inset-y-0 right-0 w-80 md:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#1A2B4C]" style={{ fontFamily: "Cormorant Garamond, serif" }}>
            Giỏ Hàng
            {items.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({items.length} sản phẩm)
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="p-2 text-gray-500 hover:text-[#1A2B4C] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-full text-center py-12"
              data-testid="cart-empty-state"
            >
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-gray-500 text-sm">Giỏ hàng trống</p>
              <p className="text-gray-400 text-xs mt-1">Thêm sản phẩm từ Showroom</p>
            </div>
          ) : (
            <div className="py-2">
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onRemove={removeItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tổng cộng</span>
              <span className="text-lg font-bold text-[#D4AF37]">{formatPrice(total)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={onClose}
              className="w-full py-3 px-6 bg-[#D4AF37] text-white font-semibold text-sm rounded-lg hover:bg-amber-600 transition-colors min-h-[48px] flex items-center justify-center"
            >
              Tiến hành Thanh Toán
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
