"use client";

import { useEffect, useRef } from "react";
import type { TailorTask, TaskStatus } from "@/types/tailor-task";
import { NEXT_STATUS } from "@/types/tailor-task";

interface TaskDetailModalProps {
  task: TailorTask;
  onClose: () => void;
  onStatusToggle: (taskId: string, newStatus: TaskStatus) => void;
  isUpdating?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  assigned: "Chờ nhận",
  in_progress: "Đang làm",
  completed: "Hoàn thành",
};

const STATUS_COLORS: Record<string, string> = {
  assigned: "bg-amber-100 text-amber-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-emerald-100 text-emerald-800",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatVND(amount: number | null): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TaskDetailModal({
  task,
  onClose,
  onStatusToggle,
  isUpdating,
}: TaskDetailModalProps) {
  const nextStatus = NEXT_STATUS[task.status];
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and Escape key handling (WCAG 2.1 AA)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handleFocus = (e: FocusEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        closeButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("focus", handleFocus, true);

    // Set focus to close button on open
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("focus", handleFocus, true);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id="task-detail-title" className="text-lg font-semibold text-[#1A1A2E]" data-testid="task-detail-title">
            Chi tiết công việc
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Đóng chi tiết công việc"
            data-testid="task-detail-close-button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Status + Overdue */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                STATUS_COLORS[task.status]
              }`}
            >
              {STATUS_LABELS[task.status]}
            </span>
            {task.is_overdue && (
              <span className="text-xs px-3 py-1 rounded-full font-medium bg-red-100 text-red-800 animate-pulse">
                Quá hạn
              </span>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Khách hàng</p>
              <p className="font-medium text-[#1A1A2E]">{task.customer_name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Sản phẩm</p>
              <p className="font-medium text-[#1A1A2E]">{task.garment_name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Hạn chót</p>
              <p className={`font-medium ${task.is_overdue ? "text-red-600" : "text-[#1A1A2E]"}`}>
                {formatDate(task.deadline)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Tiền công</p>
              <p className="font-medium text-[#D4AF37]">
                {formatVND(task.piece_rate)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Ngày giao</p>
              <p className="font-medium text-[#1A1A2E]">
                {formatDate(task.created_at)}
              </p>
            </div>
            {task.completed_at && (
              <div>
                <p className="text-gray-500 text-xs">Ngày hoàn thành</p>
                <p className="font-medium text-emerald-700">
                  {formatDate(task.completed_at)}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {task.notes && (
            <div>
              <p className="text-gray-500 text-xs mb-1">Ghi chú</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-[#1A1A2E]">
                {task.notes}
              </div>
            </div>
          )}

          {/* Blueprint Link */}
          {task.design_id && (
            <a
              href={`/tailor/review?design_sequence_id=${task.design_id}`}
              className="flex items-center gap-2 text-sm text-[#1A2B4C] hover:text-indigo-700 font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Xem Blueprint / Sanity Check
            </a>
          )}
        </div>

        {/* Footer — Status Action */}
        {nextStatus && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => onStatusToggle(task.id, nextStatus)}
              disabled={isUpdating}
              className={`w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                nextStatus === "in_progress"
                  ? "bg-[#1A2B4C] hover:bg-indigo-800"
                  : "bg-emerald-600 hover:bg-emerald-700"
              } ${isUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {isUpdating
                ? "Đang cập nhật..."
                : nextStatus === "in_progress"
                  ? "Bắt đầu làm"
                  : "Đánh dấu hoàn thành"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
