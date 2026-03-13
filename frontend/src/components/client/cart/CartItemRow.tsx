"use client";

/**
 * CartItemRow - Story 3.1: Cart State Management
 * Single item row in CartDrawer.
 */

import Image from "next/image";
import type { CartItem } from "@/types/cart";
import { formatPrice } from "@/utils/format";

interface CartItemRowProps {
  item: CartItem;
  onRemove: (id: string) => void;
}

export function CartItemRow({ item, onRemove }: CartItemRowProps) {
  const detailText =
    item.transaction_type === "buy"
      ? `Size: ${item.size}`
      : `Thuê: ${item.start_date} → ${item.end_date} (${item.rental_days} ngày)`;

  const typeLabel = item.transaction_type === "buy" ? "Mua" : "Thuê";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100">
      {/* Thumbnail */}
      <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.garment_name}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-400 text-xs">No img</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1A2B4C] line-clamp-1">
          {item.garment_name}
        </p>
        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 mb-1">
          {typeLabel}
        </span>
        <p className="text-xs text-gray-500">{detailText}</p>
        <p className="text-sm font-bold text-[#D4AF37] mt-1">
          {formatPrice(item.total_price)}
        </p>
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(item.id)}
        aria-label={`Xóa ${item.garment_name} khỏi giỏ hàng`}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
