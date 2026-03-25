"use client";

/**
 * OrderSummary - Story 3.2 + Voucher Apply
 * Displays cart totals, applied vouchers, and proceed-to-payment button.
 */

import { useRouter } from "next/navigation";
import { formatPrice } from "@/utils/format";
import type { CartAppliedVoucher } from "@/types/cart";

interface OrderSummaryProps {
  itemCount: number;
  subtotal: number;
  hasUnavailableItems: boolean;
  isVerifying: boolean;
  appliedVouchers?: CartAppliedVoucher[];
  totalDiscount?: number;
  onOpenVoucherSelector?: () => void;
  isAuthenticated?: boolean;
}

export function OrderSummary({
  itemCount,
  subtotal,
  hasUnavailableItems,
  isVerifying,
  appliedVouchers = [],
  totalDiscount = 0,
  onOpenVoucherSelector,
  isAuthenticated = false,
}: OrderSummaryProps) {
  const router = useRouter();
  const canProceed = itemCount > 0 && !hasUnavailableItems && !isVerifying;
  const finalTotal = Math.max(0, subtotal - totalDiscount);

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

        {/* Voucher section */}
        {isAuthenticated && onOpenVoucherSelector && (
          <div className="pt-1">
            {appliedVouchers.length > 0 ? (
              <div className="space-y-2">
                {appliedVouchers.map((v) => (
                  <div
                    key={v.voucher_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-[#6B7280] flex items-center gap-1.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${v.type === "percent" ? "bg-indigo-500" : "bg-emerald-500"}`} />
                      {v.code}
                    </span>
                    <span
                      className="text-green-600 font-medium"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      -{formatPrice(v.discount_amount)}
                    </span>
                  </div>
                ))}
                <button
                  onClick={onOpenVoucherSelector}
                  className="text-xs text-[#D4AF37] hover:underline font-medium"
                >
                  Thay đổi voucher
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenVoucherSelector}
                className="w-full py-2 px-3 rounded-lg border border-dashed border-[#D4AF37] text-[#D4AF37] text-sm font-medium hover:bg-amber-50 transition-colors"
              >
                + Chọn Voucher
              </button>
            )}
          </div>
        )}

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
            {formatPrice(finalTotal)}
          </span>
        </div>
        {totalDiscount > 0 && (
          <p className="text-xs text-green-600 text-right">
            Tiết kiệm {formatPrice(totalDiscount)}
          </p>
        )}
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
