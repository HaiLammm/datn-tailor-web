"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchMyTasks } from "@/app/actions/tailor-task-actions";
import type { TailorTask } from "@/types/tailor-task";
import TaskSummaryCards from "./TaskSummaryCards";
import IncomeWidget from "./IncomeWidget";

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse"
        >
          <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
          <div className="h-7 bg-gray-200 rounded w-12" />
        </div>
      ))}
    </div>
  );
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_LABELS: Record<string, string> = {
  assigned: "Chờ nhận",
  in_progress: "Đang làm",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const STATUS_COLORS: Record<string, string> = {
  assigned: "bg-amber-100 text-amber-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export default function TailorDashboardClient() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tailor-tasks"],
    queryFn: () => fetchMyTasks(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700 text-sm">
          {error instanceof Error
            ? error.message
            : "Không thể tải dữ liệu. Vui lòng thử lại."}
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <SummaryCardsSkeleton />
        <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse h-24" />
        <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse h-64" />
      </div>
    );
  }

  // Filter urgent tasks: overdue OR deadline within 2 days AND not completed/cancelled
  const urgentTasks = data.tasks
    .filter(
      (t) =>
        (t.is_overdue ||
          (t.days_until_deadline !== null &&
            t.days_until_deadline <= 2 &&
            t.status !== "completed" &&
            t.status !== "cancelled"))
    )
    .slice(0, 3); // Top 3

  return (
    <div className="space-y-4" data-testid="tailor-dashboard">
      {/* Summary Cards */}
      <TaskSummaryCards summary={data.summary} />

      {/* Quick Link to Tasks Page */}
      <Link
        href="/tailor/tasks"
        className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-[#1A2B4C] hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-[#1A1A2E]">
              Xem tất cả công việc
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Quản lý và lọc công việc chi tiết
            </p>
          </div>
          <svg
            className="w-5 h-5 text-[#1A2B4C]"
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
        </div>
      </Link>

      {/* Urgent Alerts */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-[#1A1A2E] mb-3">
          Công việc cần ưu tiên
        </h3>
        {urgentTasks.length === 0 ? (
          <p className="text-xs text-gray-500 py-2">Không có công việc gấp</p>
        ) : (
          <div className="space-y-2">
            {urgentTasks.map((task: TailorTask) => (
              <Link
                key={task.id}
                href="/tailor/tasks?status=assigned"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#1A1A2E] truncate">
                    {task.customer_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {task.garment_name}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {task.deadline && (
                    <span
                      className={`text-xs ${
                        task.is_overdue
                          ? "text-red-600 font-medium"
                          : "text-gray-600"
                      }`}
                    >
                      {formatDeadline(task.deadline)}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      STATUS_COLORS[task.status] || STATUS_COLORS.assigned
                    }`}
                  >
                    {STATUS_LABELS[task.status] || task.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Story 5.4: Income Widget — Thu Nhập Tháng Này */}
      <IncomeWidget />
    </div>
  );
}
