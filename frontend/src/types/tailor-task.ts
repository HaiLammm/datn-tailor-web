/**
 * Tailor Task TypeScript interfaces (Story 5.3)
 * Matches backend Pydantic models in backend/src/models/tailor_task.py
 */

export type TaskStatus = "assigned" | "in_progress" | "completed" | "cancelled";

export interface TailorTask {
  id: string;
  tenant_id: string;
  order_id: string;
  order_item_id: string | null;
  assigned_to: string;
  assigned_by: string;
  garment_name: string;
  customer_name: string;
  status: TaskStatus;
  deadline: string | null;
  notes: string | null;
  piece_rate: number | null;
  design_id: string | null;
  completed_at: string | null;
  is_overdue: boolean;
  days_until_deadline: number | null;
  created_at: string;
  updated_at: string;
}

export interface TailorTaskSummary {
  total: number;
  assigned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

export interface TailorTaskListResponse {
  tasks: TailorTask[];
  summary: TailorTaskSummary;
}

export interface StatusUpdateRequest {
  status: TaskStatus;
}

/** Maps current status to next valid status */
export const NEXT_STATUS: Record<string, TaskStatus | null> = {
  assigned: "in_progress",
  in_progress: "completed",
  completed: null,
  cancelled: null,
};

// ── Story 5.2: Owner Task Management Types ────────────────────────────────────

export interface TaskCreateRequest {
  order_id: string;
  order_item_id?: string | null;
  assigned_to: string;
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

export interface OwnerTaskListResponse {
  tasks: OwnerTaskItem[];
  summary: TailorTaskSummary;
}

export interface OwnerTaskFilters {
  assigned_to?: string;
  status?: string;
  overdue_only?: boolean;
}

// ── Story 5.4: Tailor Income Types ────────────────────────────────────────────

export interface TailorMonthlyIncome {
  month: number;
  year: number;
  total_income: number;
  task_count: number;
}

export interface TailorIncomeResponse {
  current_month: TailorMonthlyIncome;
  previous_month: TailorMonthlyIncome;
  /** % thay đổi thu nhập so tháng trước. null nếu tháng trước = 0. */
  percentage_change: number | null;
}

// ── Tech-Spec: Dashboard Restructure ──────────────────────────────────────────

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
