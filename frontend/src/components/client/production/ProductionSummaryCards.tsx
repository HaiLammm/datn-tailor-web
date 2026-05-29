"use client";

import type { TailorTaskSummary } from "@/types/tailor-task";

interface ProductionSummaryCardsProps {
  summary: TailorTaskSummary;
}

const cards: Array<{ key: keyof TailorTaskSummary; label: string; color: string; pulse?: boolean }> = [
  { key: "total", label: "Tổng", color: "bg-gray-100 text-gray-800" },
  { key: "unassigned", label: "Chờ giao việc", color: "bg-orange-100 text-orange-800" },
  { key: "assigned", label: "Chờ nhận", color: "bg-amber-100 text-amber-800" },
  { key: "in_progress", label: "Đang may", color: "bg-indigo-100 text-indigo-800" },
  { key: "on_hold", label: "Tạm dừng", color: "bg-yellow-100 text-yellow-800" },
  { key: "submitted_for_qc", label: "Chờ kiểm tra", color: "bg-purple-100 text-purple-800" },
  { key: "completed", label: "Hoàn thành", color: "bg-emerald-100 text-emerald-800" },
  { key: "failed_qc", label: "Không đạt QC", color: "bg-red-100 text-red-800" },
  { key: "overdue", label: "Quá hạn", color: "bg-red-100 text-red-800", pulse: true },
];

export default function ProductionSummaryCards({ summary }: ProductionSummaryCardsProps) {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-5 gap-3" data-testid="production-summary-cards">
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
            {card.pulse && summary[card.key] > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
