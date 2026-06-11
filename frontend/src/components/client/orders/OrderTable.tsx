"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderListItem, OrderStatus, RentalCondition, ServiceType, UpdatePreparationStepRequest } from "@/types/order";
import { RENT_PREP_STEPS, BUY_PREP_STEPS, RENTAL_CONDITION_LABELS } from "@/types/order";
import { OrderStatusBadge, PaymentStatusBadge, ServiceTypeBadge } from "./StatusBadge";
import { formatMoney, formatDate } from "@/utils/format";

const NEXT_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  in_progress: "Kiểm tra",
  checked: "Gửi đi",
  shipped: "Giao thành công",
  ready_to_ship: "Giao hàng",
  ready_for_pickup: "Bàn giao tại tiệm",
  delivered: "Hoàn tất",
  // Story 10.7b: rental lifecycle
  renting: "Xác nhận đã trả",
  returned: "Hoàn tất",
};

// Story 10.7b: the 'delivered' next-status label depends on service_type
// (rent → "Khách đang thuê" / renting; everything else → "Hoàn tất" / completed).
function nextStatusLabel(order: OrderListItem): string | undefined {
  if (order.status === "delivered" && order.service_type === "rent") {
    return "Khách đang thuê";
  }
  return NEXT_STATUS_LABELS[order.status];
}

// Story 10.7b: returned-rental condition badge (Tốt / Hỏng / Thất lạc)
const RENTAL_CONDITION_STYLES: Record<RentalCondition, string> = {
  Good: "bg-green-100 text-green-800",
  Damaged: "bg-amber-100 text-amber-800",
  Lost: "bg-red-100 text-red-800",
};

function RentalConditionBadge({ condition }: { condition: RentalCondition }) {
  // Fallback gracefully for any legacy / out-of-enum stored value
  const style = RENTAL_CONDITION_STYLES[condition] ?? "bg-gray-100 text-gray-700";
  const label = RENTAL_CONDITION_LABELS[condition] ?? condition;
  return (
    <span
      className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium ${style}`}
      title="Tình trạng đồ khi trả"
    >
      {label}
    </span>
  );
}

interface OrderTableProps {
  orders: OrderListItem[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (col: string) => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus, cancellationReason?: string) => Promise<void>;
  onRowClick: (order: OrderListItem) => void;
  onApprove?: (order: OrderListItem) => void;  // Story 10.4: approve action
  onAdvancePrep?: (order: OrderListItem) => void;  // Story 10.5: advance preparation step
  onRefund?: (order: OrderListItem) => void;  // Story 10.7b: open refund-security modal
}

// Story 10.5: Preparation step progress indicator
function PrepStepProgress({ order }: { order: OrderListItem }) {
  if (order.status !== "preparing" || !order.preparation_step) return null;

  const steps = order.service_type === "rent" ? RENT_PREP_STEPS : BUY_PREP_STEPS;
  const currentIndex = steps.findIndex((s) => s.key === order.preparation_step);

  // Patch #8: Handle unknown step gracefully
  if (currentIndex < 0) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <span className="text-xs text-gray-500">{order.preparation_step}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-0.5">
          <div
            className={`h-1.5 rounded-full transition-colors ${
              i <= currentIndex
                ? "bg-amber-500 w-6"
                : "bg-gray-200 w-6"
            }`}
            title={step.label}
          />
        </div>
      ))}
      <span className="text-xs text-amber-700 ml-1">
        {steps[currentIndex].label}
      </span>
    </div>
  );
}

interface CancelDialogProps {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

function CancelDialog({ onConfirm, onCancel }: CancelDialogProps) {
  const [reason, setReason] = useState("");
  const canSubmit = reason.trim().length >= 10;

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
        <p className="text-sm text-gray-600 mb-3">
          Hành động này không thể hoàn tác. Vui lòng nhập lý do huỷ đơn.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Nhập lý do huỷ đơn... (tối thiểu 10 ký tự)"
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none resize-none mb-1"
        />
        <p className={`text-xs mb-4 ${canSubmit ? "text-gray-400" : "text-red-500"}`}>
          {reason.trim().length}/10 ký tự tối thiểu
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Không
          </button>
          <button
            onClick={() => canSubmit && onConfirm(reason.trim())}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
  onApprove,
  onAdvancePrep,
  onRefund,
}: OrderTableProps) {
  const router = useRouter();
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

  async function handleCancel(reason: string) {
    if (!cancelTarget) return;
    setLoadingId(cancelTarget);
    setCancelTarget(null);
    try {
      await onStatusUpdate(cancelTarget, "cancelled", reason);
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
              const canCancel = !["delivered", "cancelled", "completed"].includes(order.status);
              const isLoading = loadingId === order.id;
              // Story 10.7b: a returned rental must be refunded before it can complete
              const needsRefund =
                order.status === "returned" &&
                order.service_type === "rent" &&
                !order.rental_condition;
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
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                      {order.customer_name}
                      {order.is_internal && (
                        <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-800 font-medium">
                          Nội bộ
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{order.customer_phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap items-center">
                      {/* Story 10.4: service_type badge (primary) */}
                      {order.service_type && (
                        <ServiceTypeBadge type={order.service_type as ServiceType} />
                      )}
                      {order.transaction_types.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-600"
                        >
                          {t === "buy" ? "Mua" : t === "rent" ? "Thuê" : "Đặt may"}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatMoney(order.total_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                    <PrepStepProgress order={order} />
                    {/* Tailor task badges for bespoke orders */}
                    {order.service_type === "bespoke" && order.tailor_task_info && (
                      <div className="mt-1 flex items-center gap-1 flex-wrap">
                        {order.tailor_task_info.task_status === "in_progress" || order.tailor_task_info.task_status === "assigned" ? (
                          <>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">
                              Đang may
                            </span>
                            <span className="text-[10px] text-gray-600 truncate max-w-[100px]">
                              {order.tailor_task_info.tailor_name}
                            </span>
                          </>
                        ) : order.tailor_task_info.task_status === "completed" ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium truncate max-w-[200px]">
                            ✓ {order.tailor_task_info.tailor_name} đã hoàn thành {order.tailor_task_info.garment_name}
                          </span>
                        ) : order.tailor_task_info.task_status === "cancellation_requested" ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium truncate max-w-[200px]">
                            ⚠ {order.tailor_task_info.tailor_name} yêu cầu huỷ {order.tailor_task_info.garment_name}
                          </span>
                        ) : null}
                      </div>
                    )}
                    {/* Story 10.6: Payment indicator for orders needing remaining payment */}
                    {(order.status === "ready_to_ship" || order.status === "ready_for_pickup") &&
                      order.remaining_amount != null &&
                      order.remaining_amount > 0 &&
                      order.payment_status !== "paid" && (
                      <span className="mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                        Chờ thanh toán
                      </span>
                    )}
                    {/* Story 10.7b: returned-rental condition badge */}
                    {order.rental_condition && (
                      <div className="mt-1">
                        <RentalConditionBadge condition={order.rental_condition} />
                      </div>
                    )}
                    {/* Story 12.7: pending post-delivery alteration request */}
                    {order.alteration_requested_at && (
                      <span
                        className="mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium"
                        data-testid="alteration-request-badge"
                      >
                        Yêu cầu chỉnh sửa
                      </span>
                    )}
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
                      {/* Story 10.4: Approve button replaces generic "Xác nhận" for pending */}
                      {order.status === "pending" && onApprove && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onApprove(order);
                          }}
                          disabled={isLoading}
                          title="Phê duyệt đơn hàng"
                          className="px-2.5 py-1 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          {isLoading ? "..." : "Phê duyệt"}
                        </button>
                      )}
                      {/* Story 10.5: Advance preparation step button */}
                      {order.status === "preparing" && order.preparation_step && onAdvancePrep && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAdvancePrep(order);
                          }}
                          disabled={isLoading}
                          title="Chuyển bước chuẩn bị tiếp theo"
                          className="px-2.5 py-1 text-xs rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          {isLoading ? "..." : "Tiếp"}
                        </button>
                      )}
                      {/* Bespoke: "Bàn giao cho thợ" navigates to production page */}
                      {order.status === "in_progress" && order.service_type === "bespoke" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/owner/production");
                          }}
                          disabled={isLoading}
                          title="Giao việc cho thợ may tại trang sản xuất"
                          className="px-2.5 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          Bàn giao cho thợ
                        </button>
                      )}
                      {/* Story 10.7b: returned rental → refund deposit before completing */}
                      {needsRefund && onRefund && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRefund(order);
                          }}
                          disabled={isLoading}
                          title="Hoàn trả cọc cho khách"
                          className="px-2.5 py-1 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          Hoàn cọc
                        </button>
                      )}
                      {/* Generic next-status button for non-pending orders (skip bespoke in_progress + refund-pending rentals) */}
                      {order.status !== "pending" && order.status !== "preparing" && nextStatus &&
                        !needsRefund &&
                        !(order.status === "in_progress" && order.service_type === "bespoke") && (
                        <button
                          onClick={(e) => handleNextStatus(e, order)}
                          disabled={isLoading}
                          title={nextStatusLabel(order)}
                          className="px-2.5 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          {isLoading ? "..." : nextStatusLabel(order)}
                        </button>
                      )}
                      {canCancel ? (
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
                      ) : order.status === "delivered" ? (
                        <span className="px-2 py-1 text-xs rounded-md bg-green-100 text-green-700 font-medium">
                          Thành công
                        </span>
                      ) : null}
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
