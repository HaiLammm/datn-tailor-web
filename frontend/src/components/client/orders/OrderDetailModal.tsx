"use client";

/**
 * Order Detail Modal for Customer Profile (Story 4.4c)
 * Displays full order detail: items, delivery info, status timeline, invoice download.
 */

import { useState } from "react";
import { downloadOrderInvoice } from "@/app/actions/order-actions";
import type { CustomerOrderDetail, TailorInfoForCustomer } from "@/types/order";
import { OrderStatusBadge, OrderTypeBadge } from "./OrderStatusBadge";
import { formatCurrency, formatDate, formatDateOnly } from "@/utils/order-formatters";
import Avatar from "@/components/ui/Avatar";

interface OrderDetailModalProps {
  order: CustomerOrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng",
  vnpay: "VNPay",
  momo: "MoMo",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  refunded: "Đã hoàn tiền",
};

const PRODUCTION_STEPS: { key: string; label: string }[] = [
  { key: "cutting", label: "Cắt vải" },
  { key: "sewing", label: "May" },
  { key: "finishing", label: "Hoàn thiện" },
  { key: "quality_check", label: "Kiểm tra" },
  { key: "done", label: "Hoàn tất" },
];

function getProductionStepIndex(step: string): number {
  return PRODUCTION_STEPS.findIndex((s) => s.key === step);
}

const RENTAL_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: "Chưa trả", className: "text-blue-600" },
  overdue: { label: "Quá hạn", className: "text-red-600 font-semibold" },
  returned: { label: "Đã trả", className: "text-gray-600" },
};

export default function OrderDetailModal({
  order,
  isOpen,
  onClose,
}: OrderDetailModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const subtotal = order.items.reduce((sum, item) => sum + item.total_price, 0);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  async function handleDownloadInvoice() {
    setDownloading(true);
    try {
      const result = await downloadOrderInvoice(order!.id);
      if (!result.success || !result.htmlContent) {
        showToast(result.error ?? "Không thể tải hóa đơn");
        return;
      }
      // Open invoice HTML in new window for printing
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(result.htmlContent);
        win.document.close();
      } else {
        // Fallback: blob download
        const blob = new Blob([result.htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `order_${order!.id}_invoice.html`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      showToast("Đã mở hóa đơn trong tab mới");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between z-10">
          <div>
            <h2
              id="order-modal-title"
              className="font-serif font-bold text-gray-900 text-lg"
            >
              Chi tiết đơn hàng
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500 font-mono">
                {order.order_number}
              </span>
              <OrderStatusBadge status={order.status} />
              <OrderTypeBadge orderType={order.order_type} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Order Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Ngày đặt</p>
              <p className="font-medium text-gray-900">{formatDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-500">Thanh toán</p>
              <p className="font-medium text-gray-900">
                {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}
              </p>
              <p className="text-xs text-gray-500">
                {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="font-semibold text-gray-800 text-sm mb-3">Sản phẩm</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-3 py-2 text-gray-700 font-semibold text-xs">Sản phẩm</th>
                    <th className="text-center px-3 py-2 text-gray-700 font-semibold text-xs">SL</th>
                    <th className="text-right px-3 py-2 text-gray-700 font-semibold text-xs">Đơn giá</th>
                    <th className="text-right px-3 py-2 text-gray-700 font-semibold text-xs">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr
                      key={`${item.garment_id}-${idx}`}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.garment_name}
                              className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0"
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-900 text-xs leading-tight">
                              {item.garment_name}
                            </p>
                            {item.size && (
                              <p className="text-xs text-gray-500">Size: {item.size}</p>
                            )}
                            {item.transaction_type === "rent" && (
                              <div className="mt-0.5 space-y-0.5">
                                {item.start_date && (
                                  <p className="text-xs text-indigo-600">
                                    Thuê: {formatDateOnly(item.start_date)} →{" "}
                                    {item.end_date ? formatDateOnly(item.end_date) : "?"}
                                  </p>
                                )}
                                {item.rental_status && (
                                  <span
                                    className={`text-xs font-medium ${
                                      RENTAL_STATUS_LABELS[item.rental_status]?.className ?? "text-gray-600"
                                    }`}
                                  >
                                    {RENTAL_STATUS_LABELS[item.rental_status]?.label ?? item.rental_status}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-700 text-xs">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-700 text-xs">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900 text-xs">
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="flex justify-end">
            <div className="w-52 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển:</span>
                <span>Miễn phí</span>
              </div>
              <div className="flex justify-between font-bold text-indigo-700 text-base border-t border-gray-200 pt-2">
                <span>Tổng cộng:</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Tailor info section */}
          {order.tailor_info && order.tailor_info.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 text-sm mb-3">
                Thợ may phụ trách
              </h3>
              <div className="space-y-3">
                {order.tailor_info.map((tailor: TailorInfoForCustomer, idx: number) => {
                  const stepIndex = getProductionStepIndex(tailor.production_step);
                  return (
                    <div
                      key={`${tailor.full_name}-${tailor.garment_name}-${idx}`}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={tailor.avatar_url}
                          name={tailor.full_name}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {tailor.full_name}
                            </span>
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                              Thợ may
                            </span>
                          </div>
                          {tailor.experience_years != null && (
                            <p className="text-xs text-gray-500">
                              {tailor.experience_years} năm kinh nghiệm
                            </p>
                          )}
                          <p className="text-xs text-gray-500 truncate">
                            {tailor.garment_name}
                          </p>
                        </div>
                      </div>

                      {/* Production sub-step progress bar */}
                      {tailor.production_step !== "pending" && (
                        <div className="relative flex items-center justify-between">
                          <div className="absolute top-2.5 left-0 right-0 h-0.5 bg-gray-200" />
                          <div
                            className="absolute top-2.5 left-0 h-0.5 bg-indigo-500 transition-all"
                            style={{
                              width:
                                stepIndex < 0
                                  ? "0%"
                                  : `${(stepIndex / (PRODUCTION_STEPS.length - 1)) * 100}%`,
                            }}
                          />
                          {PRODUCTION_STEPS.map((step, sIdx) => {
                            const done = sIdx <= stepIndex;
                            const isCurrent = sIdx === stepIndex;
                            return (
                              <div
                                key={step.key}
                                className="relative flex flex-col items-center"
                              >
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
                                    done
                                      ? "border-indigo-600 bg-indigo-600"
                                      : "border-gray-300 bg-white"
                                  } ${isCurrent ? "ring-2 ring-indigo-200" : ""}`}
                                >
                                  {done && (
                                    <svg
                                      className="w-2.5 h-2.5 text-white"
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
                                  className={`mt-1 text-xs text-center leading-tight ${
                                    done ? "text-indigo-700 font-medium" : "text-gray-400"
                                  }`}
                                  style={{ maxWidth: "56px" }}
                                >
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delivery Info */}
          <div>
            <h3 className="font-semibold text-gray-800 text-sm mb-3">Thông tin giao hàng</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1">
              <p className="font-medium text-gray-900">{order.delivery_info.recipient_name}</p>
              <p className="text-gray-600">{order.delivery_info.phone}</p>
              <p className="text-gray-600">{order.delivery_info.address}</p>
              {order.delivery_info.notes && (
                <p className="text-gray-500 text-xs mt-2">
                  <span className="font-medium">Ghi chú:</span> {order.delivery_info.notes}
                </p>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          {order.timeline.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 text-sm mb-3">
                Lịch sử trạng thái
              </h3>
              <div className="relative pl-4">
                <div className="absolute left-2 top-0 bottom-0 border-l-2 border-indigo-300" />
                <div className="space-y-4">
                  {order.timeline.map((entry, idx) => (
                    <div key={idx} className="relative flex items-start gap-3">
                      <div
                        className={`absolute -left-2.5 w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${
                          idx === order.timeline.length - 1
                            ? "bg-indigo-600"
                            : "bg-indigo-300"
                        }`}
                      />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          {entry.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Download Invoice */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleDownloadInvoice}
            disabled={downloading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
          >
            {downloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang tải...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Tải Hoá Đơn
              </>
            )}
          </button>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50">
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}
