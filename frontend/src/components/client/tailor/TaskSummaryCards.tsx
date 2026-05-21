"use client";

import type { TailorTaskSummary } from "@/types/tailor-task";

interface TaskSummaryCardsProps {
  summary: TailorTaskSummary;
}

const cards: { key: keyof TailorTaskSummary; label: string; color: string }[] = [
  { key: "total", label: "Tổng cộng", color: "bg-gray-100 text-gray-800" },
  { key: "assigned", label: "Chờ nhận", color: "bg-amber-100 text-amber-800" },
  { key: "accepted", label: "Đã nhận", color: "bg-blue-100 text-blue-800" },
  { key: "in_progress", label: "Đang may", color: "bg-indigo-100 text-indigo-800" },
  { key: "on_hold", label: "Tạm dừng", color: "bg-yellow-100 text-yellow-800" },
  { key: "submitted_for_qc", label: "Chờ kiểm tra", color: "bg-purple-100 text-purple-800" },
  { key: "completed", label: "Hoàn thành", color: "bg-emerald-100 text-emerald-800" },
  { key: "failed_qc", label: "Không đạt QC", color: "bg-red-100 text-red-800" },
];

export default function TaskSummaryCards({ summary }: TaskSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 lg:gap-3">
      {cards.map((card) => {
        const count = summary[card.key];
        if (card.key !== "total" && count === 0) return null;
        return (
          <div
            key={card.key}
            className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
            data-testid={`summary-card-${card.key}`}
          >
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-[#1A1A2E]">
                {count}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${card.color}`}
              >
                {card.label}
              </span>
            </div>
          </div>
        );
      })}
      {summary.overdue > 0 && (
        <div
          className="bg-white rounded-lg border border-red-200 p-3 shadow-sm"
          data-testid="summary-card-overdue"
        >
          <p className="text-xs text-gray-500 mb-1">Quá hạn</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-red-700">
              {summary.overdue}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 animate-pulse">
              Quá hạn
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
