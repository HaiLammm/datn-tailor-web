"use client";

import type { OrderStatus, PaymentStatus } from "@/types/order";

// ---------------------------------------------------------------------------
// Order status badge
// ---------------------------------------------------------------------------

const ORDER_STATUS_STYLES: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Chờ xác nhận", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Đã xác nhận", className: "bg-blue-100 text-blue-800" },
  in_production: { label: "Đang may", className: "bg-indigo-100 text-indigo-800" },
  shipped: { label: "Đã gửi", className: "bg-cyan-100 text-cyan-800" },
  delivered: { label: "Đã giao", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-800" },
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: "Chờ TT", className: "bg-amber-100 text-amber-800" },
  paid: { label: "Đã TT", className: "bg-green-100 text-green-800" },
  failed: { label: "TT lỗi", className: "bg-red-100 text-red-800" },
  refunded: { label: "Hoàn tiền", className: "bg-gray-100 text-gray-700" },
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_STYLES[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = PAYMENT_STATUS_STYLES[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
