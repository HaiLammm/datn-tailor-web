"use client";

/**
 * OrderSummary - Story 3.2: Render Cart Checkout Details
 * Displays cart totals and proceed-to-payment button.
 */

import { useRouter } from "next/navigation";
import { formatPrice } from "@/utils/format";

interface OrderSummaryProps {
  itemCount: number;
  subtotal: number;
  hasUnavailableItems: boolean;
  isVerifying: boolean;
}

export function OrderSummary({
  itemCount,
  subtotal,
  hasUnavailableItems,
  isVerifying,
}: OrderSummaryProps) {
  const router = useRouter();
  const canProceed = itemCount > 0 && !hasUnavailableItems && !isVerifying;

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-6 sticky top-4"
      data-testid="order-summary"
    >
      <h2
        className="text-lg font-semibold text-[#1A2B4C] mb-4"
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        Tóm Tắt Đơn Hàng
      </h2>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#6B7280]">Số lượng sản phẩm</span>
          <span className="text-[#1A1A2E] font-medium">{itemCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#6B7280]">Tạm tính</span>
          <span
            className="text-[#1A1A2E] font-medium"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {formatPrice(subtotal)}
          </span>
        </div>
        <hr className="border-gray-200" />
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-[#1A1A2E]">
            Tổng cộng
          </span>
          <span
            className="text-lg font-bold text-[#D4AF37]"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
            data-testid="order-total"
          >
            {formatPrice(subtotal)}
          </span>
        </div>
      </div>

      {hasUnavailableItems && (
        <p
          className="text-xs text-[#DC2626] mb-3"
          data-testid="unavailable-items-warning"
        >
          Vui lòng xóa các sản phẩm không khả dụng trước khi thanh toán.
        </p>
      )}

      <button
        onClick={() => router.push("/checkout/shipping")}
        disabled={!canProceed}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all duration-200 min-h-[48px] ${
          canProceed
            ? "bg-[#D4AF37] text-white hover:bg-amber-600 hover:scale-[1.02] hover:shadow-lg cursor-pointer"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
        style={{ fontFamily: "Inter, sans-serif" }}
        data-testid="proceed-button"
      >
        {isVerifying ? "Đang xác minh..." : "Tiếp Tục Thanh Toán"}
      </button>
    </div>
  );
}
