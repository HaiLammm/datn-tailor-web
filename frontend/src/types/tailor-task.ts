/**
 * Tailor Task TypeScript interfaces (Story 5.3, updated Story 12.4)
 * Matches backend Pydantic models in backend/src/models/tailor_task.py
 */

// ── 11-State Machine Types ──────────────────────────────────────────────────

export type TaskStatus =
  | "unassigned"
  | "assigned"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "on_hold"
  | "reassigning"
  | "submitted_for_qc"
  | "completed"
  | "cancelled"
  | "failed_qc"
  | "cancellation_requested";

export type TaskPriority = "normal" | "urgent";

export type RejectionCategory = "overloaded" | "not_specialty" | "personal" | "other";

export type FailureCategory = "fabric_defect" | "measurement_error" | "customer_changed_mind" | "overloaded" | "other";

export type StageLogStatus = "pending" | "in_progress" | "completed" | "skipped";

export const FAILURE_CATEGORY_LABELS: Record<FailureCategory, string> = {
  fabric_defect: "Vải bị lỗi",
  measurement_error: "Số đo sai",
  customer_changed_mind: "Khách đổi ý",
  overloaded: "Quá tải",
  other: "Khác",
};

export const STATUS_BADGE: Record<TaskStatus, { label: string; className: string }> = {
  unassigned: { label: "Chờ giao việc", className: "bg-orange-100 text-orange-800" },
  assigned: { label: "Chờ nhận", className: "bg-amber-100 text-amber-800" },
  accepted: { label: "Đã nhận", className: "bg-blue-100 text-blue-800" },
  in_progress: { label: "Đang may", className: "bg-indigo-100 text-indigo-800" },
  on_hold: { label: "Tạm dừng", className: "bg-yellow-100 text-yellow-800" },
  reassigning: { label: "Đang chuyển", className: "bg-gray-100 text-gray-800" },
  submitted_for_qc: { label: "Chờ kiểm tra", className: "bg-purple-100 text-purple-800" },
  completed: { label: "Hoàn thành", className: "bg-emerald-100 text-emerald-800" },
  failed_qc: { label: "Không đạt QC", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Đã huỷ", className: "bg-gray-100 text-gray-500" },
  rejected: { label: "Từ chối", className: "bg-rose-100 text-rose-800" },
  cancellation_requested: { label: "Yêu cầu huỷ", className: "bg-orange-100 text-orange-700" },
};

export const STAGE_LABELS: Record<string, string> = {
  cutting: "Cắt",
  body_sewing: "May thân",
  sleeve_sewing: "May tay",
  assembly: "Ráp",
  embroidery: "Thêu",
  beading: "Đính hạt",
  finishing: "Hoàn thiện",
};

// ── Core Interfaces ─────────────────────────────────────────────────────────

export interface TailorTask {
  id: string;
  tenant_id: string;
  order_id: string;
  order_item_id: string | null;
  assigned_to: string | null;
  assigned_by: string;
  garment_name: string;
  customer_name: string;
  status: TaskStatus;
  production_step: string;
  deadline: string | null;
  notes: string | null;
  piece_rate: number | null;
  design_id: string | null;
  completed_at: string | null;
  // Story 11.6: Pattern attachment via order
  order?: { pattern_session_id?: string | null } | null;
  failure_reason?: string | null;
  failure_category?: FailureCategory | null;
  cancellation_resolved_at?: string | null;
  // State machine fields (Story 12.1)
  version: number;
  accepted_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  hold_reason: string | null;
  on_hold_at: string | null;
  resumed_at: string | null;
  assignment_deadline_at: string | null;
  expected_finish_at: string | null;
  is_rework: boolean;
  rework_count: number;
  qc_issues: string | null;
  rejection_reason: string | null;
  rejection_category: RejectionCategory | null;
  reassignment_reason: string | null;
  priority: TaskPriority;
  is_overdue: boolean;
  days_until_deadline: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskStageLog {
  id: string;
  task_id: string;
  stage: string;
  stage_order: number;
  status: StageLogStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface TailorMatchingScore {
  tailor_id: string;
  tailor_name: string;
  score: number;
  workload_score: number;
  specialty_match: boolean;
  on_time_rate: number;
  reasons: string[];
}

export interface TailorTaskSummary {
  total: number;
  unassigned: number;
  assigned: number;
  accepted: number;
  rejected: number;
  in_progress: number;
  on_hold: number;
  reassigning: number;
  submitted_for_qc: number;
  completed: number;
  cancelled: number;
  failed_qc: number;
  cancellation_requested: number;
  overdue: number;
}

export interface TailorTaskListResponse {
  tasks: TailorTask[];
  summary: TailorTaskSummary;
}

/** @deprecated Use status-specific endpoints instead. Kept for backward compat with tailor components. */
export const NEXT_STATUS: Record<string, TaskStatus | null> = {
  assigned: "in_progress",
  in_progress: "completed",
  completed: null,
  cancelled: null,
};

// ── Request Types ───────────────────────────────────────────────────────────

export interface TaskRejectRequest {
  rejection_reason: string;
  rejection_category: RejectionCategory;
}

export interface TaskHoldRequest {
  hold_reason: string;
}

export interface QCResultRequest {
  result: "pass" | "fail";
  qc_issues?: string | null;
  action_on_fail?: "rework" | "reassign" | "fail" | null;
  new_tailor_id?: string | null;
}

export interface TaskReassignRequest {
  new_tailor_id: string;
  reassignment_reason: string;
}

export interface StatusUpdateRequest {
  status: TaskStatus;
}

// ── Story 5.2: Owner Task Management Types ──────────────────────────────────

export interface TaskCreateRequest {
  order_id: string;
  order_item_id?: string | null;
  assigned_to?: string | null;
  deadline?: string | null;
  notes?: string | null;
  piece_rate?: number | null;
  garment_name?: string | null;
  customer_name?: string | null;
}

export interface TaskUpdateRequest {
  deadline?: string | null;
  notes?: string | null;
  piece_rate?: number | null;
  assigned_to?: string | null;
}

export interface OwnerTaskItem extends TailorTask {
  assignee_name: string;
}

export interface OrderInfoForTask {
  order_id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  shipping_address: Record<string, unknown> | null;
  shipping_note: string | null;
}

export interface TailorTaskDetailResponse extends TailorTask {
  assignee_name: string;
  order_info: OrderInfoForTask | null;
  stage_logs: TaskStageLog[];
  history: TaskHistory[];
}

export interface OwnerTaskListResponse {
  tasks: OwnerTaskItem[];
  summary: TailorTaskSummary;
}

export interface OwnerTaskFilters {
  assigned_to?: string;
  status?: string;
  overdue_only?: boolean;
}

// ── Story 5.4: Tailor Income Types ──────────────────────────────────────────

export interface TailorMonthlyIncome {
  month: number;
  year: number;
  total_income: number;
  task_count: number;
}

export interface TailorIncomeResponse {
  current_month: TailorMonthlyIncome;
  previous_month: TailorMonthlyIncome;
  percentage_change: number | null;
}

// ── Tech-Spec: Dashboard Restructure ────────────────────────────────────────

export interface TaskFilters {
  status?: string;
  date_from?: string;
  date_to?: string;
  month?: number;
  year?: number;
}

export type IncomePeriod = "day" | "week" | "month" | "year";

export interface IncomeDetailItem {
  task_id: string;
  garment_name: string;
  customer_name: string;
  piece_rate: number;
  completed_at: string;
}

export interface TailorIncomeDetailResponse {
  items: IncomeDetailItem[];
  total_income: number;
  task_count: number;
  date: string;
}
