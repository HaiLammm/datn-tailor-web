"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  deleteTask,
  fetchMatchingScores,
  fetchTaskHistory,
  qcResult,
  reassignTask,
} from "@/app/actions/owner-task-actions";
import type { ActiveStaffUser } from "@/types/staff";
import {
  STATUS_BADGE,
  STAGE_LABELS,
  type OwnerTaskItem,
  type TaskHistory,
  type TailorMatchingScore,
  type QCResultRequest,
} from "@/types/tailor-task";

import DeadlineCountdown from "./DeadlineCountdown";
import TaskEditDialog from "./TaskEditDialog";

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

function formatDateTime(isoStr: string | null): string {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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
  const [activePanel, setActivePanel] = useState<"qc" | "reassign" | "assign" | null>(null);

  const { data: history } = useQuery({
    queryKey: ["task-history", task.id],
    queryFn: () => fetchTaskHistory(task.id),
    staleTime: 30_000,
    enabled: task.status !== "unassigned",
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-tasks"] });
      onClose();
    },
  });

  const badge = STATUS_BADGE[task.status] || { label: task.status, className: "bg-gray-100 text-gray-800" };
  const statusColor = task.is_overdue
    ? "bg-red-100 text-red-800 animate-pulse"
    : badge.className;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-xl overflow-y-auto"
        data-testid="task-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết công việc"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-[#1A1A2E]">Chi tiết công việc</h2>
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

        <div className="p-6 space-y-6">
          {/* Status + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
              {task.is_overdue ? "Quá hạn" : badge.label}
            </span>
            {task.priority === "urgent" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-500 text-white">Gấp</span>
            )}
            {task.is_rework && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500 text-white">
                Sửa lại #{task.rework_count}
              </span>
            )}
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
            <InfoRow label="Thợ may" value={task.assignee_name || "Chưa giao"} />
            <InfoRow label="Hạn chót" value={formatDate(task.deadline)} />
            <InfoRow label="Tiền công" value={formatCurrency(task.piece_rate)} />
            <InfoRow label="Ngày giao" value={formatDate(task.created_at)} />
            {task.accepted_at && <InfoRow label="Ngày nhận" value={formatDate(task.accepted_at)} />}
            {task.started_at && <InfoRow label="Bắt đầu may" value={formatDate(task.started_at)} />}
            {task.expected_finish_at && <InfoRow label="Dự kiến xong" value={formatDate(task.expected_finish_at)} />}
            {task.completed_at && <InfoRow label="Hoàn thành" value={formatDate(task.completed_at)} />}
            {task.hold_reason && <InfoRow label="Lý do dừng" value={task.hold_reason} />}
            {task.qc_issues && <InfoRow label="Vấn đề QC" value={task.qc_issues} />}
            {task.rejection_reason && <InfoRow label="Lý do từ chối" value={task.rejection_reason} />}
          </div>

          {/* Assignment deadline countdown for assigned tasks */}
          {task.status === "assigned" && task.assignment_deadline_at && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-medium">Chờ thợ phản hồi</p>
              <p className="text-xs text-amber-600 mt-1">
                Hạn phản hồi: {formatDateTime(task.assignment_deadline_at)}
              </p>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Ghi chú</p>
              <p className="text-sm text-[#1A1A2E] whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{task.notes}</p>
            </div>
          )}

          {/* Owner action buttons */}
          <OwnerActions
            task={task}
            tailors={tailors}
            activePanel={activePanel}
            setActivePanel={setActivePanel}
            onClose={onClose}
          />

          {/* History timeline */}
          {history && history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Lịch sử</p>
              <div className="space-y-2">
                {history.map((h: TaskHistory) => (
                  <div key={h.id} className="flex gap-2 text-xs">
                    <span className="text-gray-400 min-w-[70px]">{formatDateTime(h.created_at)}</span>
                    <div>
                      <span className="font-medium text-gray-700">{h.action}</span>
                      {h.from_status && h.to_status && (
                        <span className="text-gray-500"> ({h.from_status} → {h.to_status})</span>
                      )}
                      {h.reason && <p className="text-gray-500 mt-0.5">{h.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit / Delete actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-200">
            <button
              onClick={() => setShowEdit(true)}
              className="flex-1 px-4 py-2 text-sm font-medium text-[#1A2B4C] border border-[#1A2B4C] rounded-lg hover:bg-[#1A2B4C]/5"
              data-testid="btn-edit-task"
            >
              Chỉnh sửa
            </button>
            {(task.status === "assigned" || task.status === "unassigned") && (
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
              <p className="text-sm text-red-800 font-medium mb-3">Xác nhận xóa công việc này?</p>
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
                <p className="text-sm text-red-600 mt-2">{deleteMutation.error.message}</p>
              )}
            </div>
          )}

          {/* Version (debug) */}
          <p className="text-[10px] text-gray-300 text-right">v{task.version}</p>
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

// ── Owner Action Buttons ────────────────────────────────────────────────────

function OwnerActions({
  task,
  tailors,
  activePanel,
  setActivePanel,
  onClose,
}: {
  task: OwnerTaskItem;
  tailors: ActiveStaffUser[];
  activePanel: "qc" | "reassign" | "assign" | null;
  setActivePanel: (p: "qc" | "reassign" | "assign" | null) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const qcMutation = useMutation({
    mutationFn: (body: QCResultRequest) => qcResult(task.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-tasks"] });
      setActivePanel(null);
      onClose();
    },
  });

  const reassignMutation = useMutation({
    mutationFn: (body: { new_tailor_id: string; reassignment_reason: string }) =>
      reassignTask(task.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-tasks"] });
      setActivePanel(null);
      onClose();
    },
  });

  if (task.status === "unassigned") {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setActivePanel(activePanel === "assign" ? null : "assign")}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-[#1A2B4C] rounded-lg hover:bg-[#1A2B4C]/90"
        >
          Giao việc
        </button>
        {activePanel === "assign" && (
          <AssignPanel task={task} tailors={tailors} onClose={onClose} />
        )}
      </div>
    );
  }

  if (task.status === "submitted_for_qc") {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => qcMutation.mutate({ result: "pass" })}
            disabled={qcMutation.isPending}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            Đạt
          </button>
          <button
            onClick={() => setActivePanel("qc")}
            className="flex-1 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200"
          >
            Cần sửa lại
          </button>
          <button
            onClick={() => setActivePanel("reassign")}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Chuyển thợ
          </button>
        </div>
        {activePanel === "qc" && (
          <QCFailPanel mutation={qcMutation} tailors={tailors} onCancel={() => setActivePanel(null)} />
        )}
        {activePanel === "reassign" && (
          <ReassignPanel mutation={reassignMutation} tailors={tailors} onCancel={() => setActivePanel(null)} />
        )}
        {(qcMutation.error || reassignMutation.error) && (
          <p className="text-sm text-red-600">
            {(qcMutation.error || reassignMutation.error)?.message}
          </p>
        )}
      </div>
    );
  }

  if (task.status === "failed_qc") {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActivePanel(activePanel === "qc" ? null : "qc")}
            className="flex-1 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200"
          >
            Giao sửa lại
          </button>
          <button
            onClick={() => setActivePanel("reassign")}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Chuyển thợ khác
          </button>
          <button
            onClick={() => qcMutation.mutate({ result: "fail", qc_issues: task.qc_issues || "Terminal fail", action_on_fail: "fail" })}
            disabled={qcMutation.isPending}
            className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50"
          >
            Hỏng
          </button>
        </div>
        {activePanel === "qc" && (
          <QCFailPanel mutation={qcMutation} tailors={tailors} onCancel={() => setActivePanel(null)} />
        )}
        {activePanel === "reassign" && (
          <ReassignPanel mutation={reassignMutation} tailors={tailors} onCancel={() => setActivePanel(null)} />
        )}
      </div>
    );
  }

  if (task.status === "on_hold") {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setActivePanel("reassign")}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Chuyển thợ khác
        </button>
        {activePanel === "reassign" && (
          <ReassignPanel mutation={reassignMutation} tailors={tailors} onCancel={() => setActivePanel(null)} />
        )}
      </div>
    );
  }

  return null;
}

// ── Sub-panels ──────────────────────────────────────────────────────────────

function QCFailPanel({
  mutation,
  tailors,
  onCancel,
}: {
  mutation: ReturnType<typeof useMutation<unknown, Error, QCResultRequest>>;
  tailors: ActiveStaffUser[];
  onCancel: () => void;
}) {
  const [issues, setIssues] = useState("");
  const [action, setAction] = useState<"rework" | "reassign" | "fail">("rework");
  const [newTailorId, setNewTailorId] = useState("");
  const activeTailors = tailors.filter((t) => t.role === "Tailor" && t.is_active);

  const canSubmit = issues.trim().length > 0 && (action !== "reassign" || newTailorId !== "");

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <textarea
        value={issues}
        onChange={(e) => setIssues(e.target.value)}
        placeholder="Mô tả vấn đề QC..."
        rows={2}
        className="w-full text-sm border border-amber-300 rounded-lg px-2 py-1.5 resize-none"
      />
      <select
        value={action}
        onChange={(e) => setAction(e.target.value as typeof action)}
        className="w-full text-sm border border-amber-300 rounded-lg px-2 py-1.5"
      >
        <option value="rework">Sửa lại (cùng thợ)</option>
        <option value="reassign">Chuyển thợ khác</option>
        <option value="fail">Đánh dấu hỏng</option>
      </select>
      {action === "reassign" && (
        <select
          value={newTailorId}
          onChange={(e) => setNewTailorId(e.target.value)}
          className="w-full text-sm border border-amber-300 rounded-lg px-2 py-1.5"
        >
          <option value="">Chọn thợ may mới</option>
          {activeTailors.map((t) => (
            <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!canSubmit) return;
            mutation.mutate({
              result: "fail",
              qc_issues: issues.trim(),
              action_on_fail: action,
              ...(action === "reassign" ? { new_tailor_id: newTailorId } : {}),
            });
          }}
          disabled={mutation.isPending || !canSubmit}
          className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Đang xử lý..." : "Xác nhận"}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          Hủy
        </button>
      </div>
    </div>
  );
}

function ReassignPanel({
  mutation,
  tailors,
  onCancel,
}: {
  mutation: ReturnType<typeof useMutation<unknown, Error, { new_tailor_id: string; reassignment_reason: string }>>;
  tailors: ActiveStaffUser[];
  onCancel: () => void;
}) {
  const [tailorId, setTailorId] = useState("");
  const [reason, setReason] = useState("");
  const activeTailors = tailors.filter((t) => t.role === "Tailor" && t.is_active);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
      <select
        value={tailorId}
        onChange={(e) => setTailorId(e.target.value)}
        className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5"
      >
        <option value="">Chọn thợ may mới</option>
        {activeTailors.map((t) => (
          <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
        ))}
      </select>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Lý do chuyển thợ (tối thiểu 5 ký tự)..."
        rows={2}
        className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!tailorId || reason.trim().length < 5) return;
            mutation.mutate({ new_tailor_id: tailorId, reassignment_reason: reason.trim() });
          }}
          disabled={mutation.isPending || !tailorId || reason.trim().length < 5}
          className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-[#1A2B4C] rounded-lg hover:bg-[#1A2B4C]/90 disabled:opacity-50"
        >
          {mutation.isPending ? "Đang chuyển..." : "Chuyển thợ"}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          Hủy
        </button>
      </div>
    </div>
  );
}

function AssignPanel({
  task,
  tailors,
  onClose,
}: {
  task: OwnerTaskItem;
  tailors: ActiveStaffUser[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [tailorId, setTailorId] = useState("");

  const { data: scores } = useQuery({
    queryKey: ["matching-scores", task.order_id],
    queryFn: () => fetchMatchingScores(task.order_id),
    staleTime: 60_000,
  });

  const assignMutation = useMutation({
    mutationFn: () => reassignTask(task.id, { new_tailor_id: tailorId, reassignment_reason: "Owner assignment" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-tasks"] });
      onClose();
    },
  });

  const activeTailors = tailors.filter((t) => t.role === "Tailor" && t.is_active);
  const matchingScores: TailorMatchingScore[] = scores ?? [];

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
      {matchingScores.length > 0 && (
        <div className="border border-blue-200 rounded overflow-hidden mb-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-100">
                <th className="text-left py-1 px-2">Thợ may</th>
                <th className="text-right py-1 px-2">Điểm</th>
              </tr>
            </thead>
            <tbody>
              {matchingScores.map((s) => (
                <tr
                  key={s.tailor_id}
                  onClick={() => setTailorId(s.tailor_id)}
                  className={`cursor-pointer hover:bg-blue-50 ${tailorId === s.tailor_id ? "bg-blue-100" : ""}`}
                >
                  <td className="py-1 px-2">{s.tailor_name}</td>
                  <td className="py-1 px-2 text-right font-semibold">{s.score.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <select
        value={tailorId}
        onChange={(e) => setTailorId(e.target.value)}
        className="w-full text-sm border border-blue-300 rounded-lg px-2 py-1.5"
      >
        <option value="">Chọn thợ may</option>
        {activeTailors.map((t) => (
          <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
        ))}
      </select>
      <button
        onClick={() => assignMutation.mutate()}
        disabled={assignMutation.isPending || !tailorId}
        className="w-full px-3 py-1.5 text-sm font-medium text-white bg-[#1A2B4C] rounded-lg hover:bg-[#1A2B4C]/90 disabled:opacity-50"
      >
        {assignMutation.isPending ? "Đang giao..." : "Giao việc"}
      </button>
      {assignMutation.error && (
        <p className="text-sm text-red-600">{assignMutation.error.message}</p>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium text-gray-500 uppercase min-w-[100px]">{label}</span>
      <span className="text-sm text-[#1A1A2E] text-right">{value}</span>
    </div>
  );
}
