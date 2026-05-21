"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyTasks } from "@/app/actions/tailor-task-actions";
import type { TailorTask, TailorTaskListResponse, TaskFilters as TaskFiltersType } from "@/types/tailor-task";
import TaskFilters from "./TaskFilters";
import TaskSummaryCards from "./TaskSummaryCards";
import TaskList, { TaskListSkeleton } from "./TaskList";
import TaskDetailModal from "./TaskDetailModal";

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

export default function TailorTasksClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedTask, setSelectedTask] = useState<TailorTask | null>(null);

  const [filters, setFilters] = useState<TaskFiltersType>(() => {
    const status = searchParams.get("status") || undefined;
    const date_from = searchParams.get("date_from") || undefined;
    const date_to = searchParams.get("date_to") || undefined;
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");

    return {
      status,
      date_from,
      date_to,
      month: monthStr ? parseInt(monthStr, 10) : undefined,
      year: yearStr ? parseInt(yearStr, 10) : undefined,
    };
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.month) params.set("month", filters.month.toString());
    if (filters.year) params.set("year", filters.year.toString());
    const queryString = params.toString();
    router.replace(`/tailor/tasks${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [filters, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tailor-tasks-filtered", filters],
    queryFn: () => fetchMyTasks(filters),
    staleTime: 60_000,
  });

  const handleTaskUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["tailor-tasks-filtered", filters] });
    queryClient.invalidateQueries({ queryKey: ["tailor-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["tailor-income"] });
  };

  const handleFiltersChange = (newFilters: TaskFiltersType) => {
    setFilters(newFilters);
  };

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
        <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse h-48" />
        <SummaryCardsSkeleton />
        <TaskListSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tailor-tasks-page">
      <TaskFilters filters={filters} onFiltersChange={handleFiltersChange} />
      <TaskSummaryCards summary={data.summary} />
      <TaskList
        tasks={data.tasks}
        onRowClick={setSelectedTask}
      />
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </div>
  );
}
