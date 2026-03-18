"use client";

/**
 * Client wrapper for Order History page (Story 4.4c).
 * Handles: filter/search, pagination, order detail modal.
 */

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OrderDetailModal from "@/components/client/orders/OrderDetailModal";
import {
  OrderStatusBadge,
  OrderTypeBadge,
} from "@/components/client/orders/OrderStatusBadge";
import { getCustomerOrderDetail } from "@/app/actions/order-actions";
import type {
  CustomerOrderDetail,
  CustomerOrderListResponse,
  CustomerOrderSummary,
} from "@/types/order";
import { formatCurrency, formatDateOnly } from "@/utils/order-formatters";
import Link from "next/link";

interface OrdersClientProps {
  initialData: CustomerOrderListResponse | null;
  initialPage: number;
  initialStatus?: string;
  initialOrderType?: "buy" | "rental";
  error?: string;
}

export default function OrdersClient({
  initialData,
  initialPage,
  initialStatus,
  initialOrderType,
  error,
}: OrdersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? "");
  const [typeFilter, setTypeFilter] = useState(initialOrderType ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrderDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const data = initialData;
  const orders = data?.data ?? [];
  const meta = data?.meta;

  function applyFilters(newParams: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) {
        params.set(k, v);
      } else {
        params.delete(k);
      }
    });
    params.set("page", "1");
    startTransition(() => {
      router.push(`/profile/orders?${params.toString()}`);
    });
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    applyFilters({
      status: value,
      order_type: typeFilter,
      search: searchQuery,
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  function handleTypeChange(value: string) {
    setTypeFilter(value);
    applyFilters({
      status: statusFilter,
      order_type: value,
      search: searchQuery,
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    applyFilters({
      status: statusFilter,
      order_type: typeFilter,
      search: value,
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  function handleDateFromChange(value: string) {
    setDateFrom(value);
    applyFilters({
      status: statusFilter,
      order_type: typeFilter,
      search: searchQuery,
      date_from: value,
      date_to: dateTo,
    });
  }

  function handleDateToChange(value: string) {
    setDateTo(value);
    applyFilters({
      status: statusFilter,
      order_type: typeFilter,
      search: searchQuery,
      date_from: dateFrom,
      date_to: value,
    });
  }

  function handlePageChange(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    startTransition(() => {
      router.push(`/profile/orders?${params.toString()}`);
    });
  }

  async function handleOrderClick(order: CustomerOrderSummary) {
    setLoadingOrderId(order.id);
    setModalError(null);
    try {
      const result = await getCustomerOrderDetail(order.id);
      if (!result.success || !result.data) {
        setModalError(result.error ?? "Không thể tải chi tiết đơn hàng");
        return;
      }
      setSelectedOrder(result.data);
      setModalOpen(true);
    } finally {
      setLoadingOrderId(null);
    }
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={() => router.refresh()}
          className="mt-3 text-indigo-600 text-sm hover:underline"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // Empty state (AC8)
  if (orders.length === 0 && !statusFilter && !typeFilter && !searchQuery && !dateFrom && !dateTo) {
    return (
      <div className="p-12 text-center">
        <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Chưa có đơn hàng nào
        </h3>
        <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">
          Hãy bắt đầu mua sắm! Các đơn hàng của bạn sẽ hiển thị tại đây.
        </p>
        <Link
          href="/showroom"
          className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
        >
          Khám phá Showroom
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Filters (AC6) */}
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          aria-label="Lọc theo trạng thái"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ xác nhận</option>
          <option value="confirmed">Đã xác nhận</option>
          <option value="in_production">Đang may</option>
          <option value="shipped">Đã gửi</option>
          <option value="delivered">Đã giao</option>
          <option value="cancelled">Đã hủy</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          aria-label="Lọc theo loại đơn"
        >
          <option value="">Tất cả loại</option>
          <option value="buy">Mua</option>
          <option value="rental">Thuê</option>
        </select>

        <input
          type="search"
          placeholder="Tìm mã đơn..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          aria-label="Tìm kiếm mã đơn"
        />

        <input
          type="date"
          placeholder="Từ ngày"
          value={dateFrom}
          onChange={(e) => handleDateFromChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          aria-label="Từ ngày"
        />

        <input
          type="date"
          placeholder="Đến ngày"
          value={dateTo}
          onChange={(e) => handleDateToChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          aria-label="Đến ngày"
        />

        {(statusFilter || typeFilter || searchQuery || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setTypeFilter("");
              setSearchQuery("");
              setDateFrom("");
              setDateTo("");
              applyFilters({
                status: "",
                order_type: "",
                search: "",
                date_from: "",
                date_to: "",
              });
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Xoá bộ lọc
          </button>
        )}

        {isPending && (
          <span className="text-xs text-gray-400">Đang tải...</span>
        )}
      </div>

      {/* Error fetching detail */}
      {modalError && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
          {modalError}
        </div>
      )}

      {/* Orders list - Card on mobile, Table on desktop (AC7) */}
      {orders.length === 0 ? (
        <div className="px-6 py-10 text-center text-gray-500 text-sm">
          Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
        </div>
      ) : (
        <>
          {/* Mobile: Card Grid (AC7) */}
          <div className="md:hidden px-4 py-4 space-y-3">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => handleOrderClick(order)}
                disabled={loadingOrderId === order.id}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all disabled:opacity-60"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs text-gray-500">{order.order_number}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <OrderStatusBadge status={order.status} />
                    <OrderTypeBadge orderType={order.order_type} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{formatDateOnly(order.created_at)}</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop: Table (AC7) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-gray-700 font-semibold text-xs">Mã Đơn</th>
                  <th className="text-left px-4 py-3 text-gray-700 font-semibold text-xs">Ngày Đặt</th>
                  <th className="text-right px-4 py-3 text-gray-700 font-semibold text-xs">Tổng Tiền</th>
                  <th className="text-center px-4 py-3 text-gray-700 font-semibold text-xs">Trạng Thái</th>
                  <th className="text-center px-4 py-3 text-gray-700 font-semibold text-xs">Loại</th>
                  <th className="text-center px-4 py-3 text-gray-700 font-semibold text-xs"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => (
                  <tr
                    key={order.id}
                    className={`border-b border-gray-100 ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-indigo-50 transition-colors cursor-pointer`}
                    onClick={() => handleOrderClick(order)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatDateOnly(order.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <OrderTypeBadge orderType={order.order_type} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {loadingOrderId === order.id ? (
                        <svg className="w-4 h-4 animate-spin text-indigo-500 mx-auto" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <span className="text-indigo-600 text-xs font-medium hover:underline">
                          Xem chi tiết
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination (AC1) */}
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Hiển thị{" "}
                <span className="font-medium">
                  {(meta.page - 1) * meta.limit + 1}
                </span>
                –
                <span className="font-medium">
                  {Math.min(meta.page * meta.limit, meta.total)}
                </span>{" "}
                trong <span className="font-medium">{meta.total}</span> đơn hàng
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page <= 1 || isPending}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  ‹ Trước
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-700">
                  {meta.page}/{meta.total_pages}
                </span>
                <button
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page >= meta.total_pages || isPending}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Sau ›
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedOrder(null);
        }}
      />
    </div>
  );
}
