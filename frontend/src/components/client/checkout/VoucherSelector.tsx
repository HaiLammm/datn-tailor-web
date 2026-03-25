"use client";

/**
 * VoucherSelector - Voucher Apply & Discount Preview
 * Allows authenticated customers to browse and select vouchers at checkout.
 * Max 1 per type (1 percent + 1 fixed). Backend validates via preview endpoint.
 */

import { useEffect, useState, useCallback } from "react";
import { getMyVouchers } from "@/app/actions/profile-actions";
import { previewVoucherDiscount } from "@/app/actions/voucher-actions";
import { formatPrice } from "@/utils/format";
import type { VoucherItem } from "@/types/voucher";
import type { CartAppliedVoucher } from "@/types/cart";

interface VoucherSelectorProps {
  subtotal: number;
  appliedVouchers: CartAppliedVoucher[];
  onApply: (voucher: CartAppliedVoucher) => void;
  onRemove: (voucherId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function VoucherSelector({
  subtotal,
  appliedVouchers,
  onApply,
  onRemove,
  isOpen,
  onClose,
}: VoucherSelectorProps) {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [isApplyingManual, setIsApplyingManual] = useState(false);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getMyVouchers();
    if (result.success && result.data) {
      setVouchers(result.data.vouchers);
    } else {
      setError(result.error || "Không thể tải voucher");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchVouchers();
    }
  }, [isOpen, fetchVouchers]);

  // Only show PRIVATE assigned vouchers in the list (public entered via code input)
  const eligibleVouchers = vouchers.filter(
    (v) =>
      v.status === "active" &&
      v.visibility === "private" &&
      parseFloat(v.min_order_value) <= subtotal
  );

  const isApplied = (voucher: VoucherItem) =>
    appliedVouchers.some((av) => av.voucher_id === voucher.voucher_id);

  const hasPublicApplied = appliedVouchers.some((av) => av.visibility === "public");

  const handleToggle = async (voucher: VoucherItem) => {
    if (isApplied(voucher)) {
      onRemove(voucher.voucher_id);
      return;
    }

    setApplyingCode(voucher.code);

    // Build codes list: keep all existing + add new
    const otherCodes = appliedVouchers
      .filter((av) => av.voucher_id !== voucher.voucher_id)
      .map((av) => av.code);
    const newCodes = [...otherCodes, voucher.code];

    const result = await previewVoucherDiscount(newCodes, subtotal);

    if (result.success && result.data) {
      const detail = result.data.vouchers.find(
        (v) => v.code === voucher.code
      );
      if (detail) {
        onApply({
          id: voucher.id,
          voucher_id: voucher.voucher_id,
          code: voucher.code,
          type: voucher.type,
          visibility: voucher.visibility,
          value: parseFloat(voucher.value),
          discount_amount: parseFloat(detail.discount_amount),
        });
      }
    } else {
      setError(result.error || "Không thể áp dụng voucher");
      setTimeout(() => setError(null), 3000);
    }

    setApplyingCode(null);
  };

  const handleManualApply = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) return;

    setIsApplyingManual(true);
    setManualError(null);

    // Build codes: existing other-type codes + this new code
    const otherCodes = appliedVouchers.map((av) => av.code);
    const allCodes = [...otherCodes, code];

    const result = await previewVoucherDiscount(allCodes, subtotal);

    if (result.success && result.data) {
      const detail = result.data.vouchers.find(
        (v) => v.code === code
      );
      if (detail) {
        onApply({
          id: "",  // will be set by backend on order creation
          voucher_id: detail.voucher_id,
          code: detail.code,
          type: detail.type,
          visibility: detail.visibility,
          value: parseFloat(detail.value),
          discount_amount: parseFloat(detail.discount_amount),
        });
        setManualCode("");
        // Refresh voucher list to include newly auto-assigned voucher
        fetchVouchers();
      }
    } else {
      setManualError(result.error || "Mã voucher không hợp lệ");
    }

    setIsApplyingManual(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3
            className="text-lg font-semibold text-[#1A2B4C]"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            Chọn Voucher
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Manual Code Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => {
                setManualCode(e.target.value.toUpperCase());
                setManualError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleManualApply()}
              placeholder="Nhập mã voucher..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
            />
            <button
              onClick={handleManualApply}
              disabled={!manualCode.trim() || isApplyingManual}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                manualCode.trim() && !isApplyingManual
                  ? "bg-[#D4AF37] text-white hover:bg-amber-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isApplyingManual ? "..." : "Áp dụng"}
            </button>
          </div>
          {manualError && (
            <p className="text-xs text-red-500 mt-1.5">{manualError}</p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Applied public voucher indicator */}
          {hasPublicApplied && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              Đã áp dụng 1 voucher công khai
            </div>
          )}

          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
            Voucher của bạn
          </p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : eligibleVouchers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#6B7280]">
                {vouchers.length === 0
                  ? "Bạn chưa có voucher nào"
                  : "Không có voucher phù hợp với đơn hàng này"}
              </p>
            </div>
          ) : (
            eligibleVouchers.map((voucher) => {
              const applied = isApplied(voucher);
              const isApplying = applyingCode === voucher.code;
              const accentColor =
                voucher.type === "percent" ? "indigo" : "emerald";

              return (
                <div
                  key={voucher.id}
                  className={`relative flex items-stretch rounded-lg border-2 overflow-hidden transition-all ${
                    applied
                      ? `border-${accentColor}-400 bg-${accentColor}-50/30`
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {/* Accent bar */}
                  <div
                    className={`w-1.5 flex-shrink-0 ${
                      applied
                        ? `bg-${accentColor}-500`
                        : voucher.type === "percent"
                          ? "bg-indigo-400"
                          : "bg-emerald-400"
                    }`}
                  />

                  <div className="flex-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#1A1A2E]">
                          {voucher.type === "percent"
                            ? `Giảm ${parseFloat(voucher.value)}%`
                            : `Giảm ${formatPrice(parseFloat(voucher.value))}`}
                        </p>
                        <p className="text-xs font-mono text-[#6B7280] mt-0.5">
                          {voucher.code}
                        </p>
                        {parseFloat(voucher.min_order_value) > 0 && (
                          <p className="text-xs text-[#6B7280] mt-0.5">
                            Đơn tối thiểu {formatPrice(parseFloat(voucher.min_order_value))}
                          </p>
                        )}
                        {voucher.max_discount_value && (
                          <p className="text-xs text-[#6B7280]">
                            Giảm tối đa {formatPrice(parseFloat(voucher.max_discount_value))}
                          </p>
                        )}
                        <p className="text-xs text-[#9CA3AF] mt-0.5">
                          HSD: {new Date(voucher.expiry_date).toLocaleDateString("vi-VN")}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggle(voucher)}
                        disabled={isApplying}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          applied
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-[#D4AF37] text-white hover:bg-amber-600"
                        } ${isApplying ? "opacity-50 cursor-wait" : ""}`}
                      >
                        {isApplying
                          ? "..."
                          : applied
                            ? "Bỏ chọn"
                            : "Áp dụng"}
                      </button>
                    </div>

                    {applied && (
                      <p className="text-xs font-medium text-green-600 mt-1">
                        -{formatPrice(
                          appliedVouchers.find(
                            (av) => av.voucher_id === voucher.voucher_id
                          )?.discount_amount || 0
                        )}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-[#1A2B4C] text-white text-sm font-medium hover:bg-[#1A1A2E] transition-colors"
          >
            Xong ({appliedVouchers.length} voucher)
          </button>
        </div>
      </div>
    </div>
  );
}
