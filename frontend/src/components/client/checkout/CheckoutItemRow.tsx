"use client";

/**
 * CheckoutItemRow - Story 3.2: Render Cart Checkout Details
 * Single item row in checkout page with verify status display.
 */

import Image from "next/image";
import type { CartItem } from "@/types/cart";
import { formatPrice } from "@/utils/format";
import type { VerifyResult } from "@/app/actions/cart-actions";

interface CheckoutItemRowProps {
  item: CartItem;
  verifyResult?: VerifyResult;
  onRemove: (id: string) => void;
  onUpdateQuantity?: (id: string, delta: number) => void;
}

export function CheckoutItemRow({
  item,
  verifyResult,
  onRemove,
  onUpdateQuantity,
}: CheckoutItemRowProps) {
  const isUnavailable = verifyResult && !verifyResult.is_available;
  const verifiedPrice =
    verifyResult &&
    (item.transaction_type === "buy"
      ? verifyResult.verified_sale_price
      : verifyResult.verified_rental_price);
  const priceChanged =
    verifiedPrice !== undefined && verifiedPrice !== item.unit_price;

  const detailText =
    item.transaction_type === "buy"
      ? `Size: ${item.size || "—"}`
      : `Thuê: ${item.start_date} → ${item.end_date} (${item.rental_days} ngày)`;

  const typeLabel = item.transaction_type === "buy" ? "Mua" : "Thuê";
  const typeBadgeClass =
    item.transaction_type === "buy"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-amber-100 text-amber-800";

  return (
    <div
      className={`flex items-start gap-4 py-4 border-b border-gray-100 transition-opacity duration-200 ease-out ${
        isUnavailable ? "opacity-60" : ""
      }`}
      data-testid={`checkout-item-${item.id}`}
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
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
        {isUnavailable && (
          <div className="absolute inset-0 bg-red-100/70 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-[#DC2626]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium text-[#1A1A2E] line-clamp-1"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          {item.garment_name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`inline-block text-xs px-2 py-0.5 rounded-full ${typeBadgeClass}`}
          >
            {typeLabel}
          </span>
          <span className="text-xs text-[#6B7280]">{detailText}</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mt-1">
          {priceChanged ? (
            <>
              <span
                className="text-xs text-[#6B7280] line-through"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
                data-testid="old-price"
              >
                {formatPrice(item.unit_price)}
              </span>
              <span
                className="text-sm font-bold text-[#DC2626]"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
                data-testid="new-price"
              >
                {formatPrice(verifiedPrice)}
              </span>
            </>
          ) : (
            <span
              className="text-sm font-bold text-[#D4AF37]"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {formatPrice(item.unit_price)}
              {item.transaction_type === "buy" ? "" : "/ngày"}
            </span>
          )}
        </div>

        {/* Total */}
        <p
          className="text-sm font-semibold text-[#1A2B4C] mt-1"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
          data-testid="item-total"
        >
          Thành tiền: {formatPrice(item.total_price)}
        </p>

        {/* Unavailable warning */}
        {isUnavailable && (
          <p
            className="text-xs text-[#DC2626] font-medium mt-1"
            data-testid="unavailable-warning"
          >
            Sản phẩm này hiện không khả dụng
          </p>
        )}
      </div>

      {/* Actions column */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        {/* Quantity buttons (for buy items) */}
        {item.transaction_type === "buy" && onUpdateQuantity && (
          <div className="flex items-center gap-1" data-testid="quantity-controls">
            <button
              onClick={() => onUpdateQuantity(item.id, -1)}
              aria-label="Giảm số lượng"
              className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm"
            >
              −
            </button>
            <span className="w-6 text-center text-sm text-[#1A1A2E]">1</span>
            <button
              onClick={() => onUpdateQuantity(item.id, 1)}
              aria-label="Tăng số lượng"
              className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm"
            >
              +
            </button>
          </div>
        )}

        {/* Remove button */}
        <button
          onClick={() => onRemove(item.id)}
          aria-label={`Xóa ${item.garment_name}`}
          className="p-2 text-gray-400 hover:text-[#DC2626] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          data-testid={`remove-item-${item.id}`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
