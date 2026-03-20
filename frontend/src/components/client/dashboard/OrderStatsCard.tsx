"use client";

import type { OrderStats } from "@/types/kpi";

interface OrderStatsCardProps {
  stats: OrderStats;
  onClick?: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ xử lý", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Đã xác nhận", className: "bg-blue-100 text-blue-800" },
  in_progress: { label: "Đang sản xuất", className: "bg-indigo-100 text-indigo-800" },
  checked: { label: "Đã kiểm tra", className: "bg-violet-100 text-violet-800" },
  shipped: { label: "Đã giao", className: "bg-purple-100 text-purple-800" },
  delivered: { label: "Hoàn thành", className: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-800" },
};

export default function OrderStatsCard({ stats, onClick }: OrderStatsCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:shadow-md hover:border-indigo-200 transition-all w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Đơn hàng</h3>
        <span className="text-2xl font-semibold text-[#1A1A2E]">{stats.total}</span>
      </div>

      {/* Buy/Rent breakdown */}
      <div className="flex gap-3 mb-3">
        {stats.by_type.map((t) => (
          <span key={t.transaction_type} className="text-xs text-gray-500">
            {t.transaction_type === "buy" ? "Mua" : "Thuê"}: <strong className="text-gray-700">{t.count}</strong>
          </span>
        ))}
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-1.5">
        {stats.by_status
          .filter((s) => s.count > 0)
          .map((s) => {
            const config = statusConfig[s.status] || {
              label: s.status,
              className: "bg-gray-100 text-gray-700",
            };
            return (
              <span
                key={s.status}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
              >
                {config.label} {s.count}
              </span>
            );
          })}
      </div>
    </button>
  );
}
