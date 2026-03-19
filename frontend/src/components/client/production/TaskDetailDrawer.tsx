"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { deleteTask } from "@/app/actions/owner-task-actions";
import type { ActiveStaffUser } from "@/types/staff";
import type { OwnerTaskItem } from "@/types/tailor-task";

import DeadlineCountdown from "./DeadlineCountdown";
import TaskEditDialog from "./TaskEditDialog";

const STATUS_LABEL: Record<string, string> = {
  assigned: "Chờ nhận",
  in_progress: "Đang làm",
  completed: "Hoàn thành",
};

const STATUS_COLOR: Record<string, string> = {
  assigned: "bg-amber-100 text-amber-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-emerald-100 text-emerald-800",
};

interface TaskDetailDrawerProps {
  task: OwnerTaskItem;
  tailors: ActiveStaffUser[];
  onClose: () => void;
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoStr: string | null): string {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function TaskDetailDrawer({
  task,
  tailors,
  onClose,
}: TaskDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-tasks"] });
      onClose();
    },
  });

  const statusLabel = STATUS_LABEL[task.status] || task.status;
  const statusColor = task.is_overdue
    ? "bg-red-100 text-red-800 animate-pulse"
    : (STATUS_COLOR[task.status] || "bg-gray-100 text-gray-800");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-xl overflow-y-auto"
        data-testid="task-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết công việc"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1A1A2E]">
            Chi tiết công việc
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}
            >
              {task.is_overdue ? "Quá hạn" : statusLabel}
            </span>
            <DeadlineCountdown
              deadline={task.deadline}
              daysUntilDeadline={task.days_until_deadline}
              isOverdue={task.is_overdue}
            />
          </div>

          {/* Task info */}
          <div className="space-y-3">
            <InfoRow label="Khách hàng" value={task.customer_name} />
            <InfoRow label="Sản phẩm" value={task.garment_name} />
            <InfoRow label="Thợ may" value={task.assignee_name} />
            <InfoRow label="Hạn chót" value={formatDate(task.deadline)} />
            <InfoRow label="Tiền công" value={formatCurrency(task.piece_rate)} />
            <InfoRow label="Ngày giao" value={formatDate(task.created_at)} />
            {task.completed_at && (
              <InfoRow label="Ngày hoàn thành" value={formatDate(task.completed_at)} />
            )}
          </div>

          {/* Notes */}
          {task.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                Ghi chú
              </p>
              <p className="text-sm text-[#1A1A2E] whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                {task.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-200">
            <button
              onClick={() => setShowEdit(true)}
              className="flex-1 px-4 py-2 text-sm font-medium text-[#1A2B4C] border border-[#1A2B4C] rounded-lg hover:bg-[#1A2B4C]/5"
              data-testid="btn-edit-task"
            >
              Chỉnh sửa
            </button>
            {task.status === "assigned" && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                data-testid="btn-delete-task"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Delete confirmation */}
          {confirmDelete && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-3">
                Xác nhận xóa công việc này?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
              {deleteMutation.error && (
                <p className="text-sm text-red-600 mt-2">
                  {deleteMutation.error.message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      {showEdit && (
        <TaskEditDialog
          open={showEdit}
          onClose={() => setShowEdit(false)}
          task={task}
          tailors={tailors}
          onSuccess={() => {
            setShowEdit(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium text-gray-500 uppercase min-w-[100px]">
        {label}
      </span>
      <span className="text-sm text-[#1A1A2E] text-right">{value}</span>
    </div>
  );
}
