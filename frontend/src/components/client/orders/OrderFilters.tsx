"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderListParams, OrderStatus, PaymentStatus } from "@/types/order";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  in_progress: "Đang may",
  checked: "Đã kiểm tra",
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
  const [statusOpen, setStatusOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
      if (paymentRef.current && !paymentRef.current.contains(e.target as Node)) setPaymentOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Order status dropdown multi-select */}
        <div ref={statusRef} className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Trạng thái đơn
          </label>
          <button
            type="button"
            onClick={() => { setStatusOpen(!statusOpen); setPaymentOpen(false); }}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex items-center justify-between"
          >
            <span className="truncate">
              {params.status?.length
                ? params.status.map((s) => ORDER_STATUS_LABELS[s]).join(", ")
                : "Tất cả"}
            </span>
            <svg className={`w-4 h-4 ml-1 transition-transform ${statusOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {statusOpen && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-60 overflow-auto">
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                <label
                  key={s}
                  className="flex items-center px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={params.status?.includes(s) ?? false}
                    onChange={() => toggleStatus(s)}
                    className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {ORDER_STATUS_LABELS[s]}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Payment status dropdown multi-select */}
        <div ref={paymentRef} className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Thanh toán
          </label>
          <button
            type="button"
            onClick={() => { setPaymentOpen(!paymentOpen); setStatusOpen(false); }}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex items-center justify-between"
          >
            <span className="truncate">
              {params.payment_status?.length
                ? params.payment_status.map((p) => PAYMENT_STATUS_LABELS[p]).join(", ")
                : "Tất cả"}
            </span>
            <svg className={`w-4 h-4 ml-1 transition-transform ${paymentOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {paymentOpen && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-60 overflow-auto">
              {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((p) => (
                <label
                  key={p}
                  className="flex items-center px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={params.payment_status?.includes(p) ?? false}
                    onChange={() => togglePayment(p)}
                    className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {PAYMENT_STATUS_LABELS[p]}
                </label>
              ))}
            </div>
          )}
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

        {/* Order type (internal/customer) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Loại đơn
          </label>
          <select
            value={params.is_internal === undefined ? "" : params.is_internal ? "true" : "false"}
            onChange={(e) => {
              const val = e.target.value;
              onChange({
                is_internal: val === "" ? undefined : val === "true",
                page: 1,
              });
            }}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả</option>
            <option value="false">Đơn khách</option>
            <option value="true">Đơn nội bộ</option>
          </select>
        </div>
      </div>
    </div>
  );
}
