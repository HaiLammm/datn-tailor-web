"use client";

import { useState } from "react";
import type { OrderListItem, OrderStatus } from "@/types/order";
import { OrderStatusBadge, PaymentStatusBadge } from "./StatusBadge";
import { formatMoney, formatDate } from "@/utils/format";

const NEXT_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  pending: "Xác nhận",
  confirmed: "Bắt đầu may",
  in_production: "Gửi đi",
  shipped: "Giao thành công",
};

interface OrderTableProps {
  orders: OrderListItem[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (col: string) => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onRowClick: (order: OrderListItem) => void;
}

interface CancelDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function CancelDialog({ onConfirm, onCancel }: CancelDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Hủy đơn hàng?</h3>
        <p className="text-sm text-gray-600 mb-6">
          Hành động này không thể hoàn tác. Đơn hàng sẽ chuyển sang trạng thái
          &ldquo;Đã hủy&rdquo;.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Không
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Hủy đơn
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderTable({
  orders,
  sortBy,
  sortOrder,
  onSortChange,
  onStatusUpdate,
  onRowClick,
}: OrderTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  async function handleNextStatus(
    e: React.MouseEvent,
    order: OrderListItem
  ) {
    e.stopPropagation();
    const next = order.next_valid_status as OrderStatus | null;
    if (!next) return;
    setLoadingId(order.id);
    try {
      await onStatusUpdate(order.id, next);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setLoadingId(cancelTarget);
    setCancelTarget(null);
    try {
      await onStatusUpdate(cancelTarget, "cancelled");
    } finally {
      setLoadingId(null);
    }
  }

  function SortHeader({
    col,
    label,
  }: {
    col: string;
    label: string;
  }) {
    const active = sortBy === col;
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
        onClick={() => onSortChange(col)}
      >
        {label}{" "}
        {active ? (sortOrder === "desc" ? "↓" : "↑") : <span className="opacity-30">↕</span>}
      </th>
    );
  }

  return (
    <>
      {cancelTarget && (
        <CancelDialog
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mã đơn
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Khách hàng
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Loại
              </th>
              <SortHeader col="total_amount" label="Tổng tiền" />
              <SortHeader col="status" label="Trạng thái" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thanh toán
              </th>
              <SortHeader col="created_at" label="Ngày tạo" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {orders.map((order) => {
              const nextStatus = order.next_valid_status as OrderStatus | null;
              const canCancel = !["delivered", "cancelled"].includes(order.status);
              const isLoading = loadingId === order.id;
              return (
                <tr
                  key={order.id}
                  onClick={() => onRowClick(order)}
                  className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">
                    {order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {order.customer_name}
                    </div>
                    <div className="text-xs text-gray-500">{order.customer_phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {order.transaction_types.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-600"
                        >
                          {t === "buy" ? "Mua" : "Thuê"}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatMoney(order.total_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={order.payment_status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      {nextStatus && (
                        <button
                          onClick={(e) => handleNextStatus(e, order)}
                          disabled={isLoading}
                          title={NEXT_STATUS_LABELS[order.status]}
                          className="px-2.5 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          {isLoading ? "..." : NEXT_STATUS_LABELS[order.status]}
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelTarget(order.id);
                          }}
                          disabled={isLoading}
                          title="Hủy đơn"
                          className="px-2 py-1 text-xs rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
