"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderListParams, OrderStatus, PaymentStatus } from "@/types/order";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  in_production: "Đang may",
  shipped: "Đã gửi",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán lỗi",
  refunded: "Đã hoàn tiền",
};

interface OrderFiltersProps {
  params: OrderListParams;
  onChange: (updated: Partial<OrderListParams>) => void;
}

export default function OrderFilters({ params, onChange }: OrderFiltersProps) {
  const [searchInput, setSearchInput] = useState(params.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchInput(params.search ?? "");
  }, [params.search]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ search: value || undefined, page: 1 });
    }, 400);
  }

  function toggleStatus(status: OrderStatus) {
    const current = params.status ?? [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onChange({ status: updated.length ? updated : undefined, page: 1 });
  }

  function togglePayment(status: PaymentStatus) {
    const current = params.payment_status ?? [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onChange({ payment_status: updated.length ? updated : undefined, page: 1 });
  }

  function handleTransactionType(value: string) {
    onChange({
      transaction_type: value ? (value as "buy" | "rent") : undefined,
      page: 1,
    });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* Search */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Tìm kiếm
        </label>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Mã đơn, tên hoặc SĐT khách hàng..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Order status multi-select */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Trạng thái đơn
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  params.status?.includes(s)
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-300 text-gray-600 hover:border-indigo-400"
                }`}
              >
                {ORDER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Payment status multi-select */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Thanh toán
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((p) => (
              <button
                key={p}
                onClick={() => togglePayment(p)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  params.payment_status?.includes(p)
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-300 text-gray-600 hover:border-indigo-400"
                }`}
              >
                {PAYMENT_STATUS_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Loại giao dịch
          </label>
          <select
            value={params.transaction_type ?? ""}
            onChange={(e) => handleTransactionType(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả</option>
            <option value="buy">Mua</option>
            <option value="rent">Thuê</option>
          </select>
        </div>
      </div>
    </div>
  );
}
