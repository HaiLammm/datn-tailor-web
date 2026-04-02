"use client";

import type { TailorTask, TaskStatus } from "@/types/tailor-task";
import { NEXT_STATUS } from "@/types/tailor-task";

interface TaskRowProps {
  task: TailorTask;
  onStatusToggle: (taskId: string, newStatus: TaskStatus) => void;
  onRowClick: (task: TailorTask) => void;
  isUpdating?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  assigned: {
    label: "Chờ nhận",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  },
  in_progress: {
    label: "Đang làm",
    className: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-emerald-100 text-emerald-800",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-gray-100 text-gray-800",
  },
};

function formatDeadline(deadline: string | null, daysUntil: number | null): string {
  if (!deadline) return "";
  const date = new Date(deadline);
  const formatted = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
  if (daysUntil !== null && daysUntil < 0) {
    return `${formatted} (quá ${Math.abs(daysUntil)} ngày)`;
  }
  if (daysUntil !== null && daysUntil < 2) {
    return `${formatted} (còn ${daysUntil} ngày)`;
  }
  return formatted;
}

function formatPieceRate(rate: number | null): string {
  if (rate === null) return "";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(rate);
}

export default function TaskRow({
  task,
  onStatusToggle,
  onRowClick,
  isUpdating,
}: TaskRowProps) {
  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.assigned;
  const nextStatus = NEXT_STATUS[task.status];
  const canToggle = nextStatus !== null;

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canToggle && !isUpdating) {
      onStatusToggle(task.id, nextStatus);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:border-[#1A2B4C]/30 transition-colors ${
        isUpdating ? "opacity-60" : ""
      } ${task.status === "cancelled" ? "opacity-60" : ""}`}
      onClick={() => onRowClick(task)}
      data-testid={`task-row-${task.id}`}
    >
      {/* Customer & Garment */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1A2E] truncate" data-testid={`task-customer-${task.id}`}>
          {task.customer_name}
        </p>
        <p className="text-xs text-gray-500 truncate" data-testid={`task-garment-${task.id}`}>{task.garment_name}</p>
      </div>

      {/* Deadline */}
      <div className="hidden sm:block text-right shrink-0">
        {task.deadline && (
          <p
            className={`text-xs ${
              task.is_overdue ? "text-red-600 font-medium animate-pulse" : "text-gray-500"
            }`}
            data-testid={`task-deadline-${task.id}`}
          >
            {formatDeadline(task.deadline, task.days_until_deadline)}
          </p>
        )}
      </div>

      {/* Piece Rate */}
      {task.piece_rate !== null && (
        <div className="hidden md:block text-right shrink-0">
          <p className="text-xs text-[#D4AF37] font-medium" data-testid={`task-piece-rate-${task.id}`}>
            {formatPieceRate(task.piece_rate)}
          </p>
        </div>
      )}

      {/* Status Badge (clickable toggle) */}
      <button
        onClick={handleStatusClick}
        disabled={!canToggle || isUpdating}
        className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
          statusConfig.className
        } ${canToggle ? "cursor-pointer" : "cursor-default"} ${
          isUpdating ? "animate-pulse" : ""
        }`}
        title={canToggle ? `Chuyển sang: ${NEXT_STATUS[task.status] === "in_progress" ? "Đang làm" : "Hoàn thành"}` : ""}
        data-testid={`task-status-toggle-${task.id}`}
      >
        {statusConfig.label}
      </button>
    </div>
  );
}
