"use client";

/**
 * OrderConfirmationClient - Story 4.1: Payment Webhook State Handling
 * Fetches real order + payment status from backend (NEVER trusts query params).
 * Polls backend if payment_status is still "pending" (gateway hasn't called back yet).
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getOrder } from "@/app/actions/order-actions";
import { useCartStore } from "@/store/cartStore";
import { OrderConfirmation } from "./OrderConfirmation";
import type { OrderResponse } from "@/types/order";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10;

interface OrderConfirmationClientProps {
  orderId: string | null;
}

export function OrderConfirmationClient({
  orderId,
}: OrderConfirmationClientProps) {
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);
  const cartCleared = useRef(false);
  const pollCount = useRef(0);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  const fetchOrderOnce = useCallback(async (id: string): Promise<OrderResponse | null> => {
    const result = await getOrder(id);
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!orderId) {
      router.replace("/showroom");
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function fetchAndPoll() {
      const data = await fetchOrderOnce(orderId!);
      if (cancelled) return;

      if (!data) {
        setError("Không thể tải thông tin đơn hàng");
        setLoading(false);
        return;
      }

      setOrder(data);
      setLoading(false);

      // Clear cart if payment is not failed
      if (data.payment_status !== "failed" && !cartCleared.current) {
        clearCart();
        cartCleared.current = true;
      }

      // Poll if payment_status is still "pending" (webhook hasn't arrived yet)
      if (data.payment_status === "pending" && data.payment_method !== "cod") {
        setPolling(true);
        pollCount.current = 0;

        const poll = async () => {
          if (cancelled || pollCount.current >= MAX_POLL_ATTEMPTS) {
            setPolling(false);
            if (pollCount.current >= MAX_POLL_ATTEMPTS) {
              setPollingTimedOut(true);
            }
            return;
          }
          pollCount.current += 1;
          const updated = await fetchOrderOnce(orderId!);
          if (cancelled) return;

          if (updated) {
            setOrder(updated);
            if (updated.payment_status !== "pending") {
              setPolling(false);
              if (updated.payment_status !== "failed" && !cartCleared.current) {
                clearCart();
                cartCleared.current = true;
              }
              return;
            }
          }
          pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
        };

        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    fetchAndPoll();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [orderId, router, clearCart, fetchOrderOnce]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4"
            aria-label="Đang tải"
          />
          <p className="text-[#6B7280] text-sm">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[#DC2626] text-sm mb-4" data-testid="order-error">
            {error ?? "Không tìm thấy đơn hàng"}
          </p>
          <button
            onClick={() => router.push("/showroom")}
            className="px-6 py-3 bg-[#D4AF37] text-white rounded-lg font-semibold text-sm hover:bg-amber-600 transition-colors"
          >
            Về Cửa Hàng
          </button>
        </div>
      </div>
    );
  }

  // Show timeout message when polling exceeded max attempts
  if (pollingTimedOut && order.payment_status === "pending") {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#1A2B4C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
            Thanh Toán Chưa Xác Nhận
          </h1>
          <p className="text-[#6B7280] text-sm mb-6" data-testid="payment-timeout">
            Hệ thống chưa nhận được xác nhận thanh toán từ cổng thanh toán. Vui lòng đợi vài phút hoặc liên hệ cửa hàng để được hỗ trợ.
          </p>
          <button
            onClick={() => router.push("/showroom")}
            className="px-6 py-3 bg-[#D4AF37] text-white rounded-lg font-semibold text-sm hover:bg-amber-600 transition-colors"
            data-testid="payment-timeout-shop-btn"
          >
            Về Cửa Hàng
          </button>
        </div>
      </div>
    );
  }

  // Show polling state while waiting for webhook callback
  if (polling && order.payment_status === "pending") {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4"
            aria-label="Đang xác nhận thanh toán"
          />
          <p className="text-[#6B7280] text-sm" data-testid="payment-polling">
            Đang xác nhận thanh toán...
          </p>
        </div>
      </div>
    );
  }

  // Payment failed — use backend payment_status, NOT query param
  if (order.payment_status === "failed") {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#1A2B4C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
            Thanh Toán Thất Bại
          </h1>
          <p className="text-[#6B7280] text-sm mb-6">
            Đơn hàng đã được tạo nhưng thanh toán chưa hoàn tất. Vui lòng liên hệ cửa hàng để được hỗ trợ.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/showroom")}
              className="px-6 py-3 bg-[#D4AF37] text-white rounded-lg font-semibold text-sm hover:bg-amber-600 transition-colors"
              data-testid="payment-failed-shop-btn"
            >
              Về Cửa Hàng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <OrderConfirmation order={order} />;
}
