"use client";

/**
 * Customer-facing Order Status Badge (Story 4.4c)
 * Extended from StatusBadge.tsx to include rental-specific statuses:
 * returned, overdue, pending_return.
 */

import type { CustomerOrderStatus } from "@/types/order";

const CUSTOMER_STATUS_STYLES: Record<
  CustomerOrderStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Chờ xác nhận",
    className: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  in_progress: {
    label: "Đang may",
    className: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  checked: {
    label: "Đã kiểm tra",
    className: "bg-violet-50 text-violet-700 border border-violet-200",
  },
  shipped: {
    label: "Đã gửi",
    className: "bg-green-50 text-green-700 border border-green-200",
  },
  delivered: {
    label: "Đã giao",
    className: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
  returned: {
    label: "Đã trả",
    className: "bg-gray-100 text-gray-700 border border-gray-300",
  },
  overdue: {
    label: "Quá hạn",
    className: "bg-red-100 text-red-800 border border-red-300",
  },
};

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = CUSTOMER_STATUS_STYLES[status as CustomerOrderStatus] ?? {
    label: status,
    className: "bg-gray-100 text-gray-700 border border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

const ORDER_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  buy: { label: "Mua", className: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  rental: { label: "Thuê", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  mixed: { label: "Hỗn hợp", className: "bg-gray-50 text-gray-700 border border-gray-200" },
};

interface OrderTypeBadgeProps {
  orderType: string;
}

export function OrderTypeBadge({ orderType }: OrderTypeBadgeProps) {
  const config = ORDER_TYPE_LABELS[orderType] ?? {
    label: orderType,
    className: "bg-gray-50 text-gray-700 border border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
