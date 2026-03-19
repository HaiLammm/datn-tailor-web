"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { fetchAllTasks, fetchStaffData } from "@/app/actions/owner-task-actions";
import type { OwnerTaskFilters, OwnerTaskItem } from "@/types/tailor-task";

import ProductionFilters from "./ProductionFilters";
import ProductionSummaryCards from "./ProductionSummaryCards";
import ProductionTaskTable from "./ProductionTaskTable";
import TaskCreateDialog from "./TaskCreateDialog";
import TaskDetailDrawer from "./TaskDetailDrawer";

export default function ProductionBoardClient() {
  const [filters, setFilters] = useState<OwnerTaskFilters>({});
  const [sortBy, setSortBy] = useState("deadline");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedTask, setSelectedTask] = useState<OwnerTaskItem | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["owner-tasks", filters],
    queryFn: () => fetchAllTasks(filters),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: staffData } = useQuery({
    queryKey: ["staff-data"],
    queryFn: () => fetchStaffData(),
    staleTime: 300_000,
  });

  const handleSort = useCallback(
    (column: string) => {
      if (sortBy === column) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(column);
        setSortOrder("asc");
      }
    },
    [sortBy]
  );

  const sortedTasks = (() => {
    if (!data?.tasks) return [];
    const sorted = [...data.tasks];
    sorted.sort((a, b) => {
      const aVal = a[sortBy as keyof OwnerTaskItem];
      const bVal = b[sortBy as keyof OwnerTaskItem];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let cmp = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        cmp = aVal.localeCompare(bVal, "vi");
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        cmp = Number(aVal) - Number(bVal);
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }

      return sortOrder === "asc" ? cmp : -cmp;
    });
    return sorted;
  })();

  const tailors = staffData?.active_staff ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="production-board-loading">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
        <div className="h-10 bg-gray-100 rounded-lg animate-pulse w-80" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12" data-testid="production-board-error">
        <p className="text-red-600 font-medium">
          Lỗi tải dữ liệu: {error.message}
        </p>
        <p className="text-sm text-gray-500 mt-1">Vui lòng thử lại sau</p>
      </div>
    );
  }

  const summary = data?.summary ?? {
    total: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
  };

  return (
    <div className="space-y-4" data-testid="production-board">
      {/* Summary cards */}
      <ProductionSummaryCards summary={summary} />

      {/* Toolbar: filters + create button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProductionFilters
          filters={filters}
          onFiltersChange={setFilters}
          tailors={tailors}
        />
        <button
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A2B4C] text-white text-sm font-medium rounded-lg hover:bg-[#1A2B4C]/90 transition-colors"
          data-testid="btn-create-task"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Giao việc mới
        </button>
      </div>

      {/* Task table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <ProductionTaskTable
          tasks={sortedTasks}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onTaskClick={setSelectedTask}
        />
      </div>

      {/* Create dialog */}
      {showCreateDialog && (
        <TaskCreateDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          tailors={tailors}
        />
      )}

      {/* Detail drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          tailors={tailors}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
