"use client";

import type { TailorTask, TaskStatus } from "@/types/tailor-task";
import TaskRow from "./TaskRow";

interface TaskListProps {
  tasks: TailorTask[];
  onStatusToggle: (taskId: string, newStatus: TaskStatus) => void;
  onRowClick: (task: TailorTask) => void;
  updatingTaskId: string | null;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 animate-pulse">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-16" />
      <div className="h-6 bg-gray-200 rounded-full w-20" />
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export default function TaskList({
  tasks,
  onStatusToggle,
  onRowClick,
  updatingTaskId,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-sm">Chưa có công việc nào được giao.</p>
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="space-y-4">
      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div data-testid="task-list-active">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Đang thực hiện ({activeTasks.length})
          </h3>
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onStatusToggle={onStatusToggle}
                onRowClick={onRowClick}
                isUpdating={updatingTaskId === task.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div data-testid="task-list-completed">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Đã hoàn thành ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onStatusToggle={onStatusToggle}
                onRowClick={onRowClick}
                isUpdating={updatingTaskId === task.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
