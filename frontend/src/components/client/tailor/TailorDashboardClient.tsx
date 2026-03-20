"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyTasks, updateTaskStatus } from "@/app/actions/tailor-task-actions";
import type { TailorTask, TailorTaskListResponse, TaskStatus } from "@/types/tailor-task";
import { NEXT_STATUS } from "@/types/tailor-task";
import TaskSummaryCards from "./TaskSummaryCards";
import TaskList, { TaskListSkeleton } from "./TaskList";
import TaskDetailModal from "./TaskDetailModal";
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

export default function TailorDashboardClient() {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<TailorTask | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tailor-tasks"],
    queryFn: () => fetchMyTasks(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      taskId,
      newStatus,
    }: {
      taskId: string;
      newStatus: string;
    }) => updateTaskStatus(taskId, newStatus),
    onMutate: async ({ taskId, newStatus }) => {
      setUpdatingTaskId(taskId);
      await queryClient.cancelQueries({ queryKey: ["tailor-tasks"] });
      const prev = queryClient.getQueryData<TailorTaskListResponse>([
        "tailor-tasks",
      ]);

      // Optimistic update with summary recalculation
      if (prev) {
        const updatedTasks = prev.tasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus as TaskStatus } : t
        );

        // Recalculate summary based on updated tasks
        const newSummary = {
          total: updatedTasks.length,
          assigned: updatedTasks.filter((t) => t.status === "assigned").length,
          in_progress: updatedTasks.filter((t) => t.status === "in_progress")
            .length,
          completed: updatedTasks.filter((t) => t.status === "completed").length,
          overdue: updatedTasks.filter((t) => t.is_overdue).length,
        };

        queryClient.setQueryData<TailorTaskListResponse>(["tailor-tasks"], {
          ...prev,
          tasks: updatedTasks,
          summary: newSummary,
        });
      }

      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["tailor-tasks"], context.prev);
      }
    },
    onSettled: () => {
      setUpdatingTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["tailor-tasks"] });
      // Story 5.4: Re-fetch income when task status changes (completed tasks affect sum)
      queryClient.invalidateQueries({ queryKey: ["tailor-income"] });
    },
  });

  const handleStatusToggle = (taskId: string, newStatus: TaskStatus) => {
    statusMutation.mutate({ taskId, newStatus });
    // Also update modal view if open
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) =>
        prev ? { ...prev, status: newStatus } : null
      );
    }
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
        <SummaryCardsSkeleton />
        <TaskListSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tailor-dashboard">
      <TaskSummaryCards summary={data.summary} />
      <TaskList
        tasks={data.tasks}
        onStatusToggle={handleStatusToggle}
        onRowClick={setSelectedTask}
        updatingTaskId={updatingTaskId}
      />

      {/* Story 5.4: Income Widget — Thu Nhập Tháng Này */}
      <IncomeWidget />

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusToggle={handleStatusToggle}
          isUpdating={updatingTaskId === selectedTask.id}
        />
      )}
    </div>
  );
}
