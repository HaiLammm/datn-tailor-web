"use client";

import type { TailorTaskSummary } from "@/types/tailor-task";

interface ProductionSummaryCardsProps {
  summary: TailorTaskSummary;
}

const cards = [
  { key: "total" as const, label: "Tổng", color: "bg-gray-100 text-gray-800" },
  { key: "assigned" as const, label: "Chờ nhận", color: "bg-amber-100 text-amber-800" },
  { key: "in_progress" as const, label: "Đang làm", color: "bg-indigo-100 text-indigo-800" },
  { key: "completed" as const, label: "Hoàn thành", color: "bg-emerald-100 text-emerald-800" },
  { key: "overdue" as const, label: "Quá hạn", color: "bg-red-100 text-red-800" },
];

export default function ProductionSummaryCards({ summary }: ProductionSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" data-testid="production-summary-cards">
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
            {card.key === "overdue" && summary.overdue > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
