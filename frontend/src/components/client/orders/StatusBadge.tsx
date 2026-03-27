"use client";

import type { OrderStatus, PaymentStatus, ServiceType } from "@/types/order";

// ---------------------------------------------------------------------------
// Order status badge
// ---------------------------------------------------------------------------

const ORDER_STATUS_STYLES: Record<OrderStatus, { label: string; className: string }> = {
  // Legacy statuses (backward compatible)
  pending: { label: "Chờ xác nhận", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Đã xác nhận", className: "bg-blue-100 text-blue-800" },
  in_progress: { label: "Đang may", className: "bg-indigo-100 text-indigo-800" },
  checked: { label: "Đã kiểm tra", className: "bg-violet-100 text-violet-800" },
  shipped: { label: "Đã gửi", className: "bg-cyan-100 text-cyan-800" },
  delivered: { label: "Đã giao", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-800" },
  // Epic 10: new statuses
  pending_measurement: { label: "Chờ đo số đo", className: "bg-orange-100 text-orange-800" },
  preparing: { label: "Đang chuẩn bị", className: "bg-sky-100 text-sky-800" },
  ready_to_ship: { label: "Sẵn sàng giao", className: "bg-teal-100 text-teal-800" },
  ready_for_pickup: { label: "Chờ nhận tại tiệm", className: "bg-teal-100 text-teal-800" },
  in_production: { label: "Đang sản xuất", className: "bg-indigo-100 text-indigo-800" },
  renting: { label: "Đang thuê", className: "bg-purple-100 text-purple-800" },
  returned: { label: "Đã trả đồ", className: "bg-gray-100 text-gray-700" },
  completed: { label: "Hoàn tất", className: "bg-green-100 text-green-800" },
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

// ---------------------------------------------------------------------------
// Service type badge (Story 10.4)
// ---------------------------------------------------------------------------

const SERVICE_TYPE_STYLES: Record<ServiceType, { label: string; className: string }> = {
  buy: { label: "Mua", className: "bg-blue-100 text-blue-800" },
  rent: { label: "Thuê", className: "bg-amber-100 text-amber-800" },
  bespoke: { label: "Đặt may", className: "bg-purple-100 text-purple-800" },
};

interface ServiceTypeBadgeProps {
  type: ServiceType;
}

export function ServiceTypeBadge({ type }: ServiceTypeBadgeProps) {
  const config = SERVICE_TYPE_STYLES[type] ?? {
    label: type,
    className: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
