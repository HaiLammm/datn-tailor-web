"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMyIncome } from "@/app/actions/tailor-task-actions";
import type { IncomePeriod, TailorIncomeResponse, TailorIncomeDetailResponse } from "@/types/tailor-task";
import IncomeSummaryCards from "./IncomeSummaryCards";
import IncomeChart from "./IncomeChart";

/** Loading skeleton for Income Widget */
function IncomeWidgetSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4" data-testid="income-widget-skeleton">
      <div className="h-3 bg-gray-200 rounded w-32 mb-3 animate-pulse" />
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-3 animate-pulse">
            <div className="h-2 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
      <div className="h-32 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}

/** Empty state when no income data */
function IncomeEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-6 text-center"
      data-testid="income-empty-state"
    >
      <span className="text-2xl mb-2">📋</span>
      <p className="text-sm text-gray-500">Chưa có công việc hoàn thành trong kỳ này</p>
      <p className="text-xs text-gray-400 mt-1">
        Hoàn thành công việc để xem thu nhập của bạn
      </p>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const PERIOD_LABELS: Record<IncomePeriod, string> = {
  day: "Ngày",
  week: "Tuần",
  month: "Tháng",
  year: "Năm",
};

export default function IncomeWidget() {
  const [period, setPeriod] = useState<IncomePeriod>("month");
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());

  const { data, isLoading, error } = useQuery({
    queryKey: ["tailor-income", period, referenceDate.toISOString()],
    queryFn: () => fetchMyIncome(period, referenceDate.toISOString()),
    staleTime: 60_000,
  });

  const handlePreviousPeriod = () => {
    const newDate = new Date(referenceDate);
    switch (period) {
      case "day":
        newDate.setDate(newDate.getDate() - 1);
        break;
      case "week":
        newDate.setDate(newDate.getDate() - 7);
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case "year":
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    setReferenceDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(referenceDate);
    switch (period) {
      case "day":
        newDate.setDate(newDate.getDate() + 1);
        break;
      case "week":
        newDate.setDate(newDate.getDate() + 7);
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case "year":
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }
    setReferenceDate(newDate);
  };

  const isDetailResponse = (data: unknown): data is TailorIncomeDetailResponse => {
    return period === "day" && data !== null && typeof data === "object" && "items" in data;
  };

  const isSummaryResponse = (data: unknown): data is TailorIncomeResponse => {
    return data !== null && typeof data === "object" && "current_month" in data;
  };

  if (isLoading) {
    return <IncomeWidgetSkeleton />;
  }

  if (error || !data) {
    return null; // Fail silently — income is supplementary data
  }

  const isEmpty = isDetailResponse(data)
    ? data.total_income === 0
    : isSummaryResponse(data)
    ? data.current_month.total_income === 0 && data.previous_month.total_income === 0
    : true;

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4"
      data-testid="income-widget"
    >
      {/* Header with Period Tabs */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Thu Nhập
        </h3>
        <div className="flex gap-1">
          {(["day", "week", "month", "year"] as IncomePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setReferenceDate(new Date()); // Reset to today when changing period
              }}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                period === p
                  ? "bg-[#1A2B4C] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePreviousPeriod}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Kỳ trước"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <span className="text-sm font-medium text-[#1A1A2E]">
          {period === "day" && formatDate(referenceDate.toISOString())}
          {period === "week" && `Tuần ${Math.ceil((referenceDate.getDate()) / 7)}, ${referenceDate.getFullYear()}`}
          {period === "month" && `Tháng ${referenceDate.getMonth() + 1}, ${referenceDate.getFullYear()}`}
          {period === "year" && `Năm ${referenceDate.getFullYear()}`}
        </span>
        <button
          onClick={handleNextPeriod}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Kỳ tiếp theo"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      {isEmpty ? (
        <IncomeEmptyState />
      ) : (
        <div className="space-y-3">
          {isDetailResponse(data) ? (
            // Day view: show detailed task list
            <div className="space-y-2">
              <div className="bg-[#1A2B4C]/5 rounded-lg p-3 mb-2">
                <p className="text-xs text-gray-500">Tổng thu nhập</p>
                <p className="text-xl font-semibold text-[#1A2B4C]">
                  {formatCurrency(data.total_income)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.task_count} công việc hoàn thành
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">
                        Sản phẩm
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">
                        Khách hàng
                      </th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">
                        Tiền công
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.items.map((item) => (
                      <tr key={item.task_id} className="hover:bg-gray-50">
                        <td className="py-2 px-2 text-gray-700">
                          {item.garment_name}
                        </td>
                        <td className="py-2 px-2 text-gray-600">
                          {item.customer_name}
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-[#D4AF37]">
                          {formatCurrency(item.piece_rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : isSummaryResponse(data) ? (
            // Week/Month/Year view: show summary + chart
            <>
              <IncomeSummaryCards income={data} />
              <IncomeChart income={data} />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
