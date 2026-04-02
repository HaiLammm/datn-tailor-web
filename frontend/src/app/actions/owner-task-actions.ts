"use server";

/**
 * Server actions for Owner task management (Story 5.2).
 * Owner-only: create, list-all, update, delete tailor tasks.
 */

import { auth } from "@/auth";
import type {
  OwnerTaskFilters,
  OwnerTaskItem,
  OwnerTaskListResponse,
  TaskCreateRequest,
  TaskUpdateRequest,
} from "@/types/tailor-task";
import type { OrderListResponse } from "@/types/order";
import type { StaffManagementResponse } from "@/types/staff";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 10000;

/**
 * Fetch all tasks for Owner production board with optional filters.
 */
export async function fetchAllTasks(
  filters?: OwnerTaskFilters
): Promise<OwnerTaskListResponse> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const url = new URL(`${BACKEND_URL}/api/v1/tailor-tasks`);

  if (filters?.assigned_to) url.searchParams.set("assigned_to", filters.assigned_to);
  if (filters?.status) url.searchParams.set("status", filters.status);
  if (filters?.overdue_only) url.searchParams.set("overdue_only", "true");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.detail || err?.error?.message || `Lỗi máy chủ (HTTP ${response.status})`
      );
    }

    const json = await response.json();
    return json.data as OwnerTaskListResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian. Vui lòng thử lại.");
    }
    throw error;
  }
}

/**
 * Create a new task (Owner assigns work to tailor).
 */
export async function createTask(
  request: TaskCreateRequest
): Promise<OwnerTaskItem> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/tailor-tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.detail || err?.error?.message || "Giao việc thất bại"
      );
    }

    const json = await response.json();
    return json.data as OwnerTaskItem;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian. Vui lòng thử lại.");
    }
    throw error;
  }
}

/**
 * Update task fields (Owner: deadline, notes, piece_rate, reassign).
 */
export async function updateTask(
  taskId: string,
  request: TaskUpdateRequest
): Promise<OwnerTaskItem> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/tailor-tasks/${taskId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.detail || err?.error?.message || "Cập nhật thất bại"
      );
    }

    const json = await response.json();
    return json.data as OwnerTaskItem;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian. Vui lòng thử lại.");
    }
    throw error;
  }
}

/**
 * Delete a task (Owner, only if status is 'assigned').
 */
export async function deleteTask(taskId: string): Promise<void> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/tailor-tasks/${taskId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.detail || err?.error?.message || "Xóa thất bại"
      );
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian. Vui lòng thử lại.");
    }
    throw error;
  }
}

/**
 * Fetch orders with status 'confirmed' for task assignment dropdown.
 */
export async function fetchOrdersForAssignment(): Promise<OrderListResponse> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const url = new URL(`${BACKEND_URL}/api/v1/orders`);
  url.searchParams.append("status", "confirmed");
  url.searchParams.append("status", "in_progress");
  url.searchParams.append("status", "preparing");
  url.searchParams.set("page_size", "100");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.detail || err?.error?.message || "Không thể tải danh sách đơn hàng"
      );
    }

    return (await response.json()) as OrderListResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian. Vui lòng thử lại.");
    }
    throw error;
  }
}

/**
 * Fetch staff data (active tailors for assignment dropdown).
 */
export async function fetchStaffData(): Promise<StaffManagementResponse> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/staff`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.detail || err?.error?.message || "Không thể tải danh sách nhân viên"
      );
    }

    return (await response.json()) as StaffManagementResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian. Vui lòng thử lại.");
    }
    throw error;
  }
}
