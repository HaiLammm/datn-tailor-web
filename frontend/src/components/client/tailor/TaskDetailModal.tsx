"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  TailorTask,
  TailorTaskDetailResponse,
  TaskStageLog,
  FailureCategory,
  RejectionCategory,
} from "@/types/tailor-task";
import { FAILURE_CATEGORY_LABELS, STATUS_BADGE, STAGE_LABELS } from "@/types/tailor-task";
import {
  fetchTaskDetail,
  requestTaskCancellation,
  acceptTask,
  rejectTask,
  startTask,
  holdTask,
  resumeTask,
  submitForQC,
  completeStage,
} from "@/app/actions/tailor-task-actions";
import { usePatternSession, useExportPiece, useExportSession } from "@/hooks/usePatternSession";
import { PatternPreview } from "@/components/client/design/PatternPreview";
import { PatternExportBar } from "@/components/client/design/PatternExportBar";
import type { PatternPieceResponse, PieceType } from "@/types/pattern";

interface TaskDetailModalProps {
  task: TailorTask;
  onClose: () => void;
  onTaskUpdated: () => void;
}

const REJECTION_CATEGORIES: { value: RejectionCategory; label: string }[] = [
  { value: "overloaded", label: "Quá tải công việc" },
  { value: "not_specialty", label: "Không đúng chuyên môn" },
  { value: "personal", label: "Lý do cá nhân" },
  { value: "other", label: "Khác" },
];

const HOLD_REASONS = [
  { value: "Hết phụ liệu/vải", label: "Hết phụ liệu/vải" },
  { value: "Cần xác nhận từ khách", label: "Cần xác nhận từ khách" },
  { value: "Vấn đề sức khỏe", label: "Vấn đề sức khỏe" },
  { value: "Phát hiện lỗi", label: "Phát hiện lỗi" },
  { value: "__other", label: "Khác" },
];

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

function PatternSection({ patternSessionId }: { patternSessionId: string }) {
  const { session, isLoading, error } = usePatternSession(patternSessionId);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [activePiece, setActivePiece] = useState<PatternPieceResponse | null>(null);

  const handleActivePieceChange = useCallback((pieceType: PieceType) => {
    const piece = session?.pieces?.find((p) => p.piece_type === pieceType) ?? null;
    setActivePiece(piece);
  }, [session?.pieces]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Bản rập đính kèm</p>
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Bản rập đính kèm</p>
        <p className="text-sm text-red-600">Không thể tải bản rập.</p>
      </div>
    );
  }

  if (!session || !session.pieces?.length) {
    return null;
  }

  const currentActivePiece = activePiece ?? session.pieces[0] ?? null;

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bản rập đính kèm</p>
        <a
          href={`/design-session/${patternSessionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#1A2B4C] hover:underline"
        >
          Xem rập ↗
        </a>
      </div>
      <div className="max-h-[400px] overflow-hidden rounded-lg border border-gray-100">
        <PatternPreview pieces={session.pieces} onActivePieceChange={handleActivePieceChange} />
      </div>
      <PatternExportBar
        sessionId={session.id}
        pieces={session.pieces}
        activePiece={currentActivePiece}
        onToast={(msg: string, type: "success" | "error") => setToast({ msg, type })}
      />
      {toast && (
        <p className={`text-xs ${toast.type === "error" ? "text-red-600" : "text-gray-600"}`}>{toast.msg}</p>
      )}
    </div>
  );
}

export default function TaskDetailModal({
  task: initialTask,
  onClose,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [detail, setDetail] = useState<TailorTaskDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reject form state
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionCategory, setRejectionCategory] = useState<RejectionCategory | "">("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Hold form state
  const [showHoldForm, setShowHoldForm] = useState(false);
  const [holdReasonSelect, setHoldReasonSelect] = useState("");
  const [holdReasonCustom, setHoldReasonCustom] = useState("");

  // Submit QC confirmation
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, visible: true });
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }

  // Legacy cancellation form
  const [showReportForm, setShowReportForm] = useState(false);
  const [failureCategory, setFailureCategory] = useState<FailureCategory | "">("");
  const [failureReason, setFailureReason] = useState("");

  const task = detail ?? initialTask;
  const stageLogs = detail?.stage_logs ?? [];

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchTaskDetail(initialTask.id);
      setDetail(d);
    } catch {
      setError("Không thể tải chi tiết công việc.");
    } finally {
      setLoading(false);
    }
  }, [initialTask.id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

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
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("focus", handleFocus, true);
    };
  }, [onClose]);

  async function handleAction(fn: () => Promise<TailorTaskDetailResponse>): Promise<boolean> {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await fn();
      setDetail(updated);
      onTaskUpdated();
      return true;
    } catch (e) {
      if (e instanceof Error && e.message === "CONFLICT") {
        showToast("Dữ liệu đã thay đổi. Đang tải lại...");
        await loadDetail();
      } else {
        setError(e instanceof Error ? e.message : "Đã có lỗi xảy ra");
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  const handleAccept = () => handleAction(() => acceptTask(initialTask.id, task.version));
  const handleStart = () => handleAction(() => startTask(initialTask.id, task.version));
  const handleResume = () => handleAction(() => resumeTask(initialTask.id, task.version));

  async function handleReject() {
    if (!rejectionCategory || rejectionReason.trim().length < 10) return;
    const ok = await handleAction(() =>
      rejectTask(initialTask.id, task.version, {
        rejection_category: rejectionCategory,
        rejection_reason: rejectionReason.trim(),
      })
    );
    if (ok) setShowRejectForm(false);
  }

  async function handleHold() {
    const reason = holdReasonSelect === "__other" ? holdReasonCustom.trim() : holdReasonSelect;
    if (!reason || reason.length < 5) return;
    const ok = await handleAction(() => holdTask(initialTask.id, task.version, { hold_reason: reason }));
    if (ok) setShowHoldForm(false);
  }

  async function handleSubmitQC() {
    const ok = await handleAction(() => submitForQC(initialTask.id, task.version));
    if (ok) setShowSubmitConfirm(false);
  }

  async function handleCompleteStage(stageOrder: number) {
    await handleAction(() => completeStage(initialTask.id, stageOrder, task.version));
  }

  async function handleSubmitReport() {
    if (!failureCategory || failureReason.trim().length < 10) return;
    setActionLoading(true);
    try {
      await requestTaskCancellation(initialTask.id, failureCategory, failureReason.trim());
      onTaskUpdated();
      onClose();
    } catch {
      setError("Không thể gửi yêu cầu");
    } finally {
      setActionLoading(false);
    }
  }

  const completedStages = stageLogs.filter((s) => s.status === "completed").length;
  const totalStages = stageLogs.length;
  const allStagesComplete = detail !== null && !loading && (totalStages === 0 || completedStages === totalStages);
  const badge = STATUS_BADGE[task.status] ?? STATUS_BADGE.assigned;
  const busy = loading || actionLoading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-lg sm:mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-gray-200 z-10">
          <h2 id="task-detail-title" className="text-lg font-semibold text-[#1A1A2E]" data-testid="task-detail-title">
            Chi tiết công việc
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Đóng"
            data-testid="task-detail-close-button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Status + Priority + Rework */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${badge.className}`}>
              {badge.label}
            </span>
            {task.priority === "urgent" && (
              <span className="text-xs px-3 py-1 rounded-full font-medium bg-red-600 text-white">GẤP</span>
            )}
            {task.is_rework && task.rework_count > 0 && (
              <span className="text-xs px-3 py-1 rounded-full font-medium bg-amber-600 text-white">
                Sửa lần {task.rework_count}
              </span>
            )}
            {task.is_overdue && (
              <span className="text-xs px-3 py-1 rounded-full font-medium bg-red-100 text-red-800 animate-pulse">
                Quá hạn
              </span>
            )}
          </div>

          {/* QC Issues (failed_qc) */}
          {task.status === "failed_qc" && task.qc_issues && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-medium text-red-800 mb-1">Vấn đề QC cần sửa:</p>
              <p className="text-sm text-red-700">{task.qc_issues}</p>
            </div>
          )}

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
              <p className="font-medium text-[#D4AF37]">{formatVND(task.piece_rate)}</p>
            </div>
            {task.expected_finish_at && (
              <div>
                <p className="text-gray-500 text-xs">Dự kiến xong</p>
                <p className="font-medium text-[#1A1A2E]">{formatDate(task.expected_finish_at)}</p>
              </div>
            )}
            {task.completed_at && (
              <div>
                <p className="text-gray-500 text-xs">Ngày hoàn thành</p>
                <p className="font-medium text-emerald-700">{formatDate(task.completed_at)}</p>
              </div>
            )}
          </div>

          {task.notes && (
            <div>
              <p className="text-gray-500 text-xs mb-1">Ghi chú</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-[#1A1A2E]">{task.notes}</div>
            </div>
          )}

          {/* Hold reason display */}
          {task.status === "on_hold" && task.hold_reason && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs font-medium text-yellow-800 mb-1">Lý do tạm dừng:</p>
              <p className="text-sm text-yellow-700">{task.hold_reason}</p>
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

          {/* Pattern Preview (Story 11.6) */}
          {task.order?.pattern_session_id && (
            <PatternSection patternSessionId={task.order.pattern_session_id} />
          )}

          {/* ── Stage Checklist ─────────────────────────────────────────────── */}
          {stageLogs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Tiến độ công đoạn</p>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${totalStages > 0 ? (completedStages / totalStages) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mb-2">
                {completedStages}/{totalStages} công đoạn ({totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0}%)
              </p>

              <div className="space-y-2">
                {[...stageLogs]
                  .sort((a, b) => a.stage_order - b.stage_order)
                  .map((stage: TaskStageLog) => {
                    const isCurrentStage = stage.status === "in_progress";
                    const canComplete =
                      isCurrentStage &&
                      task.status === "in_progress" &&
                      !busy;

                    return (
                      <div
                        key={stage.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                          isCurrentStage
                            ? "border-indigo-300 bg-indigo-50"
                            : stage.status === "completed"
                            ? "border-emerald-200 bg-emerald-50"
                            : stage.status === "skipped"
                            ? "border-gray-200 bg-gray-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        {/* Status indicator */}
                        <div className="shrink-0">
                          {stage.status === "completed" ? (
                            <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : stage.status === "skipped" ? (
                            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          ) : isCurrentStage ? (
                            <div className="w-5 h-5 rounded-full border-2 border-indigo-500 bg-indigo-100" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                          )}
                        </div>

                        <span className={`flex-1 text-sm ${isCurrentStage ? "font-medium text-indigo-800" : stage.status === "completed" ? "text-emerald-700" : stage.status === "skipped" ? "line-through text-gray-400" : "text-gray-500"}`}>
                          {STAGE_LABELS[stage.stage] ?? stage.stage}
                        </span>

                        {canComplete && (
                          <button
                            onClick={() => handleCompleteStage(stage.stage_order)}
                            disabled={actionLoading}
                            className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors min-h-[44px]"
                          >
                            Hoàn thành
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* ── Footer Actions ─────────────────────────────────────────────── */}
        <div className="sticky bottom-0 bg-white p-4 border-t border-gray-200 space-y-3">

          {/* Accept / Reject (assigned) */}
          {task.status === "assigned" && !showRejectForm && (
            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                disabled={busy}
                className="flex-1 py-3 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors min-h-[44px]"
                data-testid="task-accept-btn"
              >
                {actionLoading ? "Đang xử lý..." : "Nhận việc"}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={busy}
                className="flex-1 py-3 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors min-h-[44px]"
                data-testid="task-reject-btn"
              >
                Từ chối
              </button>
            </div>
          )}

          {/* Reject form */}
          {showRejectForm && task.status === "assigned" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-red-800">Lý do từ chối</p>
              <select
                value={rejectionCategory}
                onChange={(e) => setRejectionCategory(e.target.value as RejectionCategory)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-red-300 outline-none min-h-[44px]"
              >
                <option value="">Chọn lý do...</option>
                {REJECTION_CATEGORIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Mô tả chi tiết... (tối thiểu 10 ký tự)"
                rows={3}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-300 outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={!rejectionCategory || rejectionReason.trim().length < 10 || busy}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors min-h-[44px]"
                >
                  {actionLoading ? "Đang gửi..." : "Xác nhận từ chối"}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  Huỷ
                </button>
              </div>
            </div>
          )}

          {/* Start work (accepted) */}
          {task.status === "accepted" && (
            <button
              onClick={handleStart}
              disabled={busy}
              className="w-full py-3 rounded-lg text-sm font-medium text-white bg-[#1A2B4C] hover:bg-indigo-800 disabled:opacity-50 transition-colors min-h-[44px]"
              data-testid="task-start-btn"
            >
              {actionLoading ? "Đang xử lý..." : "Bắt đầu may"}
            </button>
          )}

          {/* Hold / Submit QC (in_progress) */}
          {task.status === "in_progress" && !showHoldForm && !showSubmitConfirm && (
            <div className="flex gap-2">
              {allStagesComplete ? (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={busy}
                  className="flex-1 py-3 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors min-h-[44px]"
                  data-testid="task-submit-qc-btn"
                >
                  Hoàn tất & Gửi kiểm tra
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 py-3 rounded-lg text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed min-h-[44px]"
                  title="Hoàn thành tất cả công đoạn trước"
                >
                  Hoàn tất & Gửi kiểm tra
                </button>
              )}
              <button
                onClick={() => setShowHoldForm(true)}
                disabled={busy}
                className="px-4 py-3 rounded-lg text-sm font-medium text-yellow-800 border border-yellow-300 hover:bg-yellow-50 transition-colors min-h-[44px]"
                data-testid="task-hold-btn"
              >
                Tạm dừng
              </button>
            </div>
          )}

          {/* Hold form */}
          {showHoldForm && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-yellow-800">Lý do tạm dừng</p>
              <select
                value={holdReasonSelect}
                onChange={(e) => {
                  setHoldReasonSelect(e.target.value);
                  if (e.target.value !== "__other") setHoldReasonCustom("");
                }}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-yellow-300 outline-none min-h-[44px]"
              >
                <option value="">Chọn lý do...</option>
                {HOLD_REASONS.map((opt) => (
                  <option key={opt.value || "__other"} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {holdReasonSelect === "__other" && (
                <textarea
                  value={holdReasonCustom}
                  onChange={(e) => setHoldReasonCustom(e.target.value)}
                  placeholder="Nhập lý do... (tối thiểu 5 ký tự)"
                  rows={2}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-300 outline-none resize-none"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleHold}
                  disabled={(!holdReasonSelect || (holdReasonSelect === "__other" && holdReasonCustom.trim().length < 5)) || busy}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors min-h-[44px]"
                >
                  {actionLoading ? "Đang xử lý..." : "Xác nhận tạm dừng"}
                </button>
                <button
                  onClick={() => setShowHoldForm(false)}
                  className="px-4 py-2.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  Huỷ
                </button>
              </div>
            </div>
          )}

          {/* Submit QC confirmation */}
          {showSubmitConfirm && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-purple-800">Xác nhận gửi kiểm tra chất lượng?</p>
              <p className="text-xs text-purple-600">Sau khi gửi, chủ tiệm sẽ kiểm tra sản phẩm của bạn.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitQC}
                  disabled={busy}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors min-h-[44px]"
                >
                  {actionLoading ? "Đang gửi..." : "Xác nhận gửi"}
                </button>
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="px-4 py-2.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  Huỷ
                </button>
              </div>
            </div>
          )}

          {/* Resume (on_hold) */}
          {task.status === "on_hold" && (
            <button
              onClick={handleResume}
              disabled={busy}
              className="w-full py-3 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors min-h-[44px]"
              data-testid="task-resume-btn"
            >
              {actionLoading ? "Đang xử lý..." : "Tiếp tục làm việc"}
            </button>
          )}

          {/* Rework (failed_qc) — show start button to begin rework */}
          {task.status === "failed_qc" && (
            <button
              onClick={handleStart}
              disabled={busy}
              className="w-full py-3 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors min-h-[44px]"
              data-testid="task-rework-btn"
            >
              {actionLoading ? "Đang xử lý..." : "Bắt đầu sửa lại"}
            </button>
          )}

          {/* Submitted for QC — info */}
          {task.status === "submitted_for_qc" && (
            <p className="text-sm text-purple-700 bg-purple-50 rounded-lg p-3 text-center">
              Đã gửi kiểm tra. Chờ chủ tiệm đánh giá.
            </p>
          )}

          {/* Completed — info */}
          {task.status === "completed" && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3 text-center">
              Công việc đã hoàn thành.
            </p>
          )}

          {/* Cancellation requested — info */}
          {(task.status as string) === "cancellation_requested" && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 text-center">
              Yêu cầu huỷ đã được gửi. Chờ chủ tiệm xác nhận.
            </p>
          )}

          {/* Report button (legacy cancellation) — only for assigned/in_progress */}
          {(task.status === "assigned" || task.status === "in_progress") && !showRejectForm && !showHoldForm && !showSubmitConfirm && (
            <button
              onClick={() => setShowReportForm(!showReportForm)}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 transition-colors min-h-[44px]"
            >
              Báo lỗi / Yêu cầu huỷ
            </button>
          )}

          {showReportForm && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-red-800">Báo lỗi / Yêu cầu huỷ</p>
              <select
                value={failureCategory}
                onChange={(e) => setFailureCategory(e.target.value as FailureCategory)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-red-300 outline-none min-h-[44px]"
              >
                <option value="">Chọn loại lỗi...</option>
                {(Object.entries(FAILURE_CATEGORY_LABELS) as [FailureCategory, string][]).map(
                  ([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ),
                )}
              </select>
              <textarea
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="Mô tả chi tiết lý do... (tối thiểu 10 ký tự)"
                rows={3}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-300 outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitReport}
                  disabled={!failureCategory || failureReason.trim().length < 10 || busy}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors min-h-[44px]"
                >
                  {actionLoading ? "Đang gửi..." : "Gửi yêu cầu"}
                </button>
                <button
                  onClick={() => setShowReportForm(false)}
                  className="px-4 py-2.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  Huỷ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {toast.visible && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[60] bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          {toast.message}
        </div>
      )}
    </div>
  );
}
