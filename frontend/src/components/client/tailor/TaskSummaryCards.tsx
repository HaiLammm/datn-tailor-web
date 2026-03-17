"use client";

import type { TailorTaskSummary } from "@/types/tailor-task";

interface TaskSummaryCardsProps {
  summary: TailorTaskSummary;
}

const cards = [
  { key: "total" as const, label: "Tổng cộng", color: "bg-gray-100 text-gray-800" },
  { key: "assigned" as const, label: "Chờ nhận", color: "bg-amber-100 text-amber-800" },
  { key: "in_progress" as const, label: "Đang làm", color: "bg-indigo-100 text-indigo-800" },
  { key: "completed" as const, label: "Hoàn thành", color: "bg-emerald-100 text-emerald-800" },
];

export default function TaskSummaryCards({ summary }: TaskSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
      {cards.map((card) => (
        <div
          key={card.key}
          className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
          data-testid={`summary-card-${card.key}`}
        >
          <p className="text-xs text-gray-500 mb-1">{card.label}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-[#1A1A2E]">
              {summary[card.key]}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${card.color}`}
            >
              {card.label}
            </span>
          </div>
        </div>
      ))}
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
