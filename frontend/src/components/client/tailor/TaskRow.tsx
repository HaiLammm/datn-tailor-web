"use client";

import type { TailorTask, TaskStatus } from "@/types/tailor-task";
import { STATUS_BADGE, TERMINAL_STATUSES } from "@/types/tailor-task";

interface TaskRowProps {
  task: TailorTask;
  onRowClick: (task: TailorTask) => void;
}

const ACTION_LABELS: Partial<Record<TaskStatus, string>> = {
  assigned: "Nhận việc",
  accepted: "Bắt đầu",
  in_progress: "Đang may",
  on_hold: "Tiếp tục",
  failed_qc: "Sửa lại",
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
  onRowClick,
}: TaskRowProps) {
  const badge = STATUS_BADGE[task.status] ?? STATUS_BADGE.assigned;
  const actionLabel = ACTION_LABELS[task.status];
  const isTerminal = TERMINAL_STATUSES.includes(task.status);

  return (
    <div
      className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:border-[#1A2B4C]/30 transition-colors ${
        isTerminal ? "opacity-60" : ""}`}
      onClick={() => onRowClick(task)}
      data-testid={`task-row-${task.id}`}
    >
      {/* Customer & Garment */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-[#1A1A2E] truncate" data-testid={`task-customer-${task.id}`}>
            {task.customer_name}
          </p>
          {task.priority === "urgent" && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white font-medium">
              GẤP
            </span>
          )}
          {task.is_rework && task.rework_count > 0 && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-600 text-white font-medium">
              Sửa lần {task.rework_count}
            </span>
          )}
        </div>
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

      {/* Status Badge */}
      <div className="shrink-0 flex items-center gap-1.5">
        {actionLabel && !isTerminal && (
          <span className="text-[10px] text-gray-400 hidden sm:inline">{actionLabel} →</span>
        )}
        <span
          className={`text-xs px-3 py-1.5 rounded-full font-medium ${badge.className}`}
          data-testid={`task-status-toggle-${task.id}`}
        >
          {badge.label}
        </span>
      </div>
    </div>
  );
}
