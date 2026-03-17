/**
 * Tailor Task TypeScript interfaces (Story 5.3)
 * Matches backend Pydantic models in backend/src/models/tailor_task.py
 */

export type TaskStatus = "assigned" | "in_progress" | "completed";

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
};
