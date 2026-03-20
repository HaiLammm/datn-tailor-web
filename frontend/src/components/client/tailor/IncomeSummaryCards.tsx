"use client";

import type { TailorIncomeResponse } from "@/types/tailor-task";

interface IncomeSummaryCardsProps {
  income: TailorIncomeResponse;
}

/** Format number as VND compact string (e.g. 1.5tr, 500k) */
function formatVND(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${value.toFixed(0)}₫`;
}

/** Format full VND string for tooltip/label */
function formatVNDFull(value: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function getMonthLabel(month: number, year: number): string {
  return `Th${month}/${year}`;
}

export default function IncomeSummaryCards({ income }: IncomeSummaryCardsProps) {
  const { current_month, previous_month, percentage_change } = income;
  const isPositive = percentage_change !== null && percentage_change > 0;
  const isNegative = percentage_change !== null && percentage_change < 0;
  const isZero = percentage_change !== null && percentage_change === 0;

  return (
    <div className="grid grid-cols-3 gap-2" data-testid="income-summary-cards">
      {/* Thu Nhập Tháng Này */}
      <div
        className="bg-white rounded-lg border border-[#D4AF37]/40 p-3"
        data-testid="income-current-month"
      >
        <p className="text-xs text-gray-500 mb-1">
          Thu Nhập {getMonthLabel(current_month.month, current_month.year)}
        </p>
        <p
          className="text-xl font-bold text-[#1A2B4C] font-mono tracking-tight"
          title={formatVNDFull(current_month.total_income)}
        >
          {formatVND(current_month.total_income)}
          <span className="text-xs font-normal text-gray-400 ml-1">
            {current_month.task_count > 0 ? `${current_month.task_count} sp` : ""}
          </span>
        </p>
        <p className="text-xs text-[#D4AF37] mt-1 font-medium">Tháng này</p>
      </div>

      {/* Thu Nhập Tháng Trước */}
      <div
        className="bg-white rounded-lg border border-gray-200 p-3"
        data-testid="income-previous-month"
      >
        <p className="text-xs text-gray-500 mb-1">
          Thu Nhập {getMonthLabel(previous_month.month, previous_month.year)}
        </p>
        <p
          className="text-xl font-bold text-gray-600 font-mono tracking-tight"
          title={formatVNDFull(previous_month.total_income)}
        >
          {formatVND(previous_month.total_income)}
          <span className="text-xs font-normal text-gray-400 ml-1">
            {previous_month.task_count > 0 ? `${previous_month.task_count} sp` : ""}
          </span>
        </p>
        <p className="text-xs text-gray-400 mt-1 font-medium">Tháng trước</p>
      </div>

      {/* Tăng Trưởng */}
      <div
        className="bg-white rounded-lg border border-gray-200 p-3"
        data-testid="income-percentage-change"
      >
        <p className="text-xs text-gray-500 mb-1">Tăng Trưởng</p>
        {percentage_change === null ? (
          <>
            <p className="text-xl font-bold text-gray-400 font-mono">N/A</p>
            <p className="text-xs text-gray-400 mt-1">Chưa có dữ liệu tháng trước</p>
          </>
        ) : (
          <>
            <p
              className={`text-xl font-bold font-mono tracking-tight ${
                isPositive
                  ? "text-[#059669]"
                  : isNegative
                  ? "text-[#DC2626]"
                  : "text-gray-500"
              }`}
            >
              {isPositive && "↑ "}
              {isNegative && "↓ "}
              {isZero && "→ "}
              {Math.abs(percentage_change).toFixed(1)}%
            </p>
            <p
              className={`text-xs mt-1 font-medium ${
                isPositive ? "text-[#059669]" : isNegative ? "text-[#DC2626]" : "text-gray-400"
              }`}
            >
              {isPositive ? "Tốt hơn tháng trước" : isNegative ? "Ít hơn tháng trước" : "Bằng tháng trước"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
