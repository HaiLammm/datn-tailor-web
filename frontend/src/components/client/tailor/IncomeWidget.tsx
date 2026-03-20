"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMyIncome } from "@/app/actions/tailor-task-actions";
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

/** Empty state when both months have 0 income */
function IncomeEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-6 text-center"
      data-testid="income-empty-state"
    >
      <span className="text-2xl mb-2">📋</span>
      <p className="text-sm text-gray-500">Chưa có công việc hoàn thành tháng này</p>
      <p className="text-xs text-gray-400 mt-1">
        Hoàn thành công việc để xem thu nhập của bạn
      </p>
    </div>
  );
}

export default function IncomeWidget() {
  const { data: income, isLoading, error } = useQuery({
    queryKey: ["tailor-income"],
    queryFn: () => fetchMyIncome(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <IncomeWidgetSkeleton />;
  }

  if (error || !income) {
    return null; // Fail silently — income is supplementary data
  }

  const isEmpty =
    income.current_month.total_income === 0 &&
    income.previous_month.total_income === 0;

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4"
      data-testid="income-widget"
    >
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Thu Nhập Tháng Này
      </h3>

      {isEmpty ? (
        <IncomeEmptyState />
      ) : (
        <div className="space-y-3">
          <IncomeSummaryCards income={income} />
          <IncomeChart income={income} />
        </div>
      )}
    </div>
  );
}
