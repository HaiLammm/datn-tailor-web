"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { OrderDetailResponse, OrderStatus } from "@/types/order";
import { OrderStatusBadge, PaymentStatusBadge } from "./StatusBadge";
import { formatMoney, formatDateTime } from "@/utils/format";

const PIPELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Chờ xác nhận" },
  { status: "confirmed", label: "Đã xác nhận" },
  { status: "in_production", label: "Đang may" },
  { status: "shipped", label: "Đã gửi" },
  { status: "delivered", label: "Đã giao" },
];

const TX_STATUS_LABELS: Record<string, string> = {
  success: "Thành công",
  failed: "Thất bại",
  pending: "Đang xử lý",
  refunded: "Đã hoàn tiền",
};

interface OrderDetailDrawerProps {
  detail: OrderDetailResponse | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function OrderDetailDrawer({
  detail,
  isLoading,
  onClose,
}: OrderDetailDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const { order, transactions } = detail ?? { order: null, transactions: [] };

  // Determine current step index (cancelled renders outside pipeline)
  const currentStepIndex =
    order && order.status !== "cancelled"
      ? PIPELINE_STEPS.findIndex((s) => s.status === order.status)
      : -1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#1A1A2E]">
          <h2 className="text-lg font-semibold text-white">
            Chi tiết đơn hàng
          </h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors text-2xl leading-none"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 bg-gray-100 rounded-lg" />
              ))}
            </div>
          )}

          {!isLoading && order && (
            <>
              {/* Order ID & badges */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Mã đơn hàng
                  </p>
                  <p className="font-mono text-sm text-gray-800 mt-0.5">
                    {order.id.toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(order.created_at)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.payment_status} />
                </div>
              </div>

              {/* Order timeline */}
              {order.status !== "cancelled" && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Tiến trình đơn hàng
                  </p>
                  <div className="relative flex items-center justify-between">
                    {/* Track line */}
                    <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200" />
                    <div
                      className="absolute top-3 left-0 h-0.5 bg-indigo-500 transition-all"
                      style={{
                        width:
                          currentStepIndex < 0
                            ? "0%"
                            : `${(currentStepIndex / (PIPELINE_STEPS.length - 1)) * 100}%`,
                      }}
                    />
                    {PIPELINE_STEPS.map((step, idx) => {
                      const done = idx <= currentStepIndex;
                      return (
                        <div
                          key={step.status}
                          className="relative flex flex-col items-center"
                        >
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
                              done
                                ? "border-indigo-600 bg-indigo-600"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {done && (
                              <svg
                                className="w-3 h-3 text-white"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`mt-1.5 text-xs text-center leading-tight ${
                              done ? "text-indigo-700 font-medium" : "text-gray-400"
                            }`}
                            style={{ maxWidth: "64px" }}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Customer info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Thông tin khách hàng
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Họ tên: </span>
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">SĐT: </span>
                    <span className="font-medium">{order.customer_phone}</span>
                  </div>
                </div>
                {order.shipping_address && (
                  <div className="text-sm">
                    <span className="text-gray-500">Địa chỉ: </span>
                    <span>
                      {order.shipping_address.address_detail},{" "}
                      {order.shipping_address.ward},{" "}
                      {order.shipping_address.district},{" "}
                      {order.shipping_address.province}
                    </span>
                  </div>
                )}
                {order.shipping_note && (
                  <div className="text-sm">
                    <span className="text-gray-500">Ghi chú: </span>
                    <span className="italic">{order.shipping_note}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Sản phẩm ({order.items.length})
                </p>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg"
                    >
                      {item.image_url ? (
                        <div className="relative w-14 h-14 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                          <Image
                            src={item.image_url}
                            alt={item.garment_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center text-gray-300 text-xl">
                          👗
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.garment_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.transaction_type === "buy" ? "Mua" : "Thuê"}
                          {item.size ? ` · Size ${item.size}` : ""}
                          {item.rental_days ? ` · ${item.rental_days} ngày` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatMoney(item.total_price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center py-3 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-700">Tổng cộng</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatMoney(order.total_amount)}
                </span>
              </div>

              {/* Payment transactions */}
              {transactions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Lịch sử thanh toán
                  </p>
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <div>
                          <p className="font-medium capitalize">{tx.provider}</p>
                          <p className="text-xs text-gray-500">
                            {tx.transaction_id} · {formatDateTime(tx.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatMoney(tx.amount)}</p>
                          <span
                            className={`text-xs ${
                              tx.status === "success"
                                ? "text-green-600"
                                : tx.status === "failed"
                                ? "text-red-600"
                                : "text-amber-600"
                            }`}
                          >
                            {TX_STATUS_LABELS[tx.status] ?? tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
