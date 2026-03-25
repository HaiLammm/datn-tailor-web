"use client";

/**
 * CheckoutClient - Story 3.2 + Voucher Apply
 * Main checkout client component: displays cart items, verifies with backend,
 * handles remove/update actions with Optimistic UI, and voucher selection.
 */

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/cartStore";
import { verifyCartItems } from "@/app/actions/cart-actions";
import { previewVoucherDiscount } from "@/app/actions/voucher-actions";
import type { VerifyResult } from "@/app/actions/cart-actions";
import { CheckoutItemRow } from "./CheckoutItemRow";
import { OrderSummary } from "./OrderSummary";
import { VoucherSelector } from "./VoucherSelector";

type VerifyState = "idle" | "loading" | "success" | "error";

export function CheckoutClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateItem = useCartStore((state) => state.updateItem);
  const cartTotal = useCartStore((state) => state.cartTotal);
  const appliedVouchers = useCartStore((state) => state.appliedVouchers);
  const applyVoucher = useCartStore((state) => state.applyVoucher);
  const removeVoucher = useCartStore((state) => state.removeVoucher);
  const totalDiscount = useCartStore((state) => state.totalDiscount);

  const clearVouchers = useCartStore((state) => state.clearVouchers);

  const [verifyResults, setVerifyResults] = useState<
    Record<string, VerifyResult>
  >({});
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [, startTransition] = useTransition();
  const [showVoucherSelector, setShowVoucherSelector] = useState(false);
  const [voucherWarning, setVoucherWarning] = useState<string | null>(null);

  // Redirect to showroom if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.replace("/showroom");
    }
  }, [items.length, router]);

  // Verify cart items on mount and after changes
  const runVerification = useCallback(async () => {
    if (items.length === 0) return;

    setVerifyState("loading");
    try {
      const results = await verifyCartItems(
        items.map((item) => ({
          garment_id: item.garment_id,
          transaction_type: item.transaction_type,
        }))
      );

      const resultsMap: Record<string, VerifyResult> = {};
      for (const r of results) {
        resultsMap[r.garment_id] = r;
      }
      setVerifyResults(resultsMap);

      // Update cart prices if backend prices changed
      for (const r of results) {
        const cartItem = items.find((i) => i.garment_id === r.garment_id);
        if (!cartItem) continue;
        const verifiedUnitPrice =
          cartItem.transaction_type === "buy"
            ? r.verified_sale_price
            : r.verified_rental_price;
        if (verifiedUnitPrice > 0 && verifiedUnitPrice !== cartItem.unit_price) {
          const newTotal =
            cartItem.transaction_type === "rent" && cartItem.rental_days
              ? verifiedUnitPrice * cartItem.rental_days
              : verifiedUnitPrice;
          startTransition(() => {
            updateItem(cartItem.id, {
              unit_price: verifiedUnitPrice,
              total_price: newTotal,
            });
          });
        }
      }

      setVerifyState("success");
    } catch {
      setVerifyState("error");
    }
  }, [items, updateItem]);

  useEffect(() => {
    runVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-validate applied vouchers on checkout load
  // Catches deactivated/expired vouchers that are still in localStorage
  useEffect(() => {
    if (appliedVouchers.length === 0 || items.length === 0) return;

    const subtotal = cartTotal();
    const codes = appliedVouchers.map((v) => v.code);

    previewVoucherDiscount(codes, subtotal).then((result) => {
      if (!result.success) {
        // Voucher(s) no longer valid — clear and warn
        clearVouchers();
        setVoucherWarning(
          result.error || "Một số voucher không còn hiệu lực và đã được gỡ khỏi đơn hàng."
        );
      } else if (result.data) {
        // Update discount amounts in case they changed (e.g., cart total changed)
        for (const detail of result.data.vouchers) {
          const existing = appliedVouchers.find((v) => v.code === detail.code);
          if (existing && parseFloat(detail.discount_amount) !== existing.discount_amount) {
            applyVoucher({
              ...existing,
              discount_amount: parseFloat(detail.discount_amount),
            });
          }
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemove = (id: string) => {
    removeItem(id);
  };

  const hasUnavailableItems = items.some((item) => {
    const result = verifyResults[item.garment_id];
    return result && !result.is_available;
  });

  const isAuthenticated = !!session?.user;

  // Don't render if cart will redirect
  if (items.length === 0) {
    return null;
  }

  const summaryProps = {
    itemCount: items.length,
    subtotal: cartTotal(),
    hasUnavailableItems,
    isVerifying: verifyState === "loading",
    appliedVouchers,
    totalDiscount: totalDiscount(),
    onOpenVoucherSelector: () => setShowVoucherSelector(true),
    isAuthenticated,
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1
          className="text-2xl md:text-3xl font-semibold text-[#1A2B4C] mb-6"
          style={{ fontFamily: "Cormorant Garamond, serif", fontWeight: 600 }}
        >
          Xem Lại Giỏ Hàng
        </h1>

        {/* Voucher re-validation warning */}
        {voucherWarning && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center justify-between">
            <span>{voucherWarning}</span>
            <button
              onClick={() => setVoucherWarning(null)}
              className="ml-3 text-amber-600 hover:text-amber-800 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Items list */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
              {verifyState === "loading" ? (
                <div data-testid="checkout-skeleton">
                  {Array.from({ length: items.length }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 py-4 border-b border-gray-100 animate-pulse"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 bg-gray-200 rounded" />
                        <div className="h-3 w-1/3 bg-gray-200 rounded" />
                        <div className="h-4 w-1/4 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div data-testid="checkout-items-list">
                  {items.map((item) => (
                    <CheckoutItemRow
                      key={item.id}
                      item={item}
                      verifyResult={verifyResults[item.garment_id]}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              )}

              {verifyState === "error" && (
                <div
                  className="mt-4 p-3 bg-red-50 rounded-lg flex items-center justify-between"
                  data-testid="verify-error"
                >
                  <p className="text-sm text-[#DC2626]">
                    Không thể xác minh giỏ hàng. Vui lòng thử lại.
                  </p>
                  <button
                    onClick={runVerification}
                    className="text-sm font-medium text-[#D4AF37] hover:underline"
                    data-testid="retry-button"
                  >
                    Thử lại
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary - desktop sidebar, mobile sticky bottom */}
          <div className="lg:col-span-4">
            <div className="hidden lg:block">
              <OrderSummary {...summaryProps} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky OrderSummary */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-30">
        <OrderSummary {...summaryProps} />
      </div>

      {/* Voucher Selector Modal */}
      <VoucherSelector
        subtotal={cartTotal()}
        appliedVouchers={appliedVouchers}
        onApply={applyVoucher}
        onRemove={removeVoucher}
        isOpen={showVoucherSelector}
        onClose={() => setShowVoucherSelector(false)}
      />
    </div>
  );
}
