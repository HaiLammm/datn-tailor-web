"use server";

/**
 * Server actions for Tailor Task Dashboard (Story 5.3)
 * Tailor/Owner authenticated endpoints.
 */

import { auth } from "@/auth";
import type {
  TailorIncomeResponse,
  TailorTask,
  TailorTaskListResponse,
  TailorTaskSummary,
} from "@/types/tailor-task";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 10000;

async function getAuthToken(): Promise<string> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) {
    throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");
  }
  return token;
}

function createAbortController(): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  return { controller, timeoutId };
}

/**
 * Fetch all tasks assigned to current tailor with summary.
 */
export async function fetchMyTasks(): Promise<TailorTaskListResponse> {
  const token = await getAuthToken();
  const { controller, timeoutId } = createAbortController();

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/tailor-tasks/my-tasks`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      throw new Error("Không có quyền truy cập. Vui lòng đăng nhập lại.");
    }

    if (!response.ok) {
      throw new Error(`Lỗi tải dữ liệu công việc (HTTP ${response.status})`);
    }

    const json = await response.json();
    return json.data as TailorTaskListResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Hết thời gian kết nối. Vui lòng thử lại.");
      }
      throw error;
    }
    throw new Error("Lỗi không xác định khi tải danh sách công việc.");
  }
}

/**
 * Fetch task summary counts.
 */
export async function fetchTaskSummary(): Promise<TailorTaskSummary> {
  const token = await getAuthToken();
  const { controller, timeoutId } = createAbortController();

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/tailor-tasks/summary`, {
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
      throw new Error(`Lỗi tải tổng hợp (HTTP ${response.status})`);
    }

    const json = await response.json();
    return json.data as TailorTaskSummary;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Hết thời gian kết nối. Vui lòng thử lại.");
      }
      throw error;
    }
    throw new Error("Lỗi không xác định khi tải tổng hợp.");
  }
}

/**
 * Update task status (1-touch toggle).
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: string
): Promise<TailorTask> {
  const token = await getAuthToken();
  const { controller, timeoutId } = createAbortController();

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/tailor-tasks/${taskId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
        signal: controller.signal,
        cache: "no-store",
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 400) {
      const errorJson = await response.json();
      throw new Error(errorJson.detail || "Chuyển trạng thái không hợp lệ.");
    }

    if (response.status === 403) {
      throw new Error("Bạn không có quyền cập nhật công việc này.");
    }

    if (!response.ok) {
      throw new Error(`Lỗi cập nhật trạng thái (HTTP ${response.status})`);
    }

    const json = await response.json();
    return json.data as TailorTask;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Hết thời gian kết nối. Vui lòng thử lại.");
      }
      throw error;
    }
    throw new Error("Lỗi không xác định khi cập nhật trạng thái.");
  }
}

/**
 * Fetch monthly income summary for current tailor.
 * Returns current month + previous month totals and percentage change.
 */
export async function fetchMyIncome(): Promise<TailorIncomeResponse> {
  const token = await getAuthToken();
  const { controller, timeoutId } = createAbortController();

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/tailor-tasks/my-income`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      throw new Error("Không có quyền truy cập. Vui lòng đăng nhập lại.");
    }

    if (!response.ok) {
      throw new Error(`Lỗi tải dữ liệu thu nhập (HTTP ${response.status})`);
    }

    const json = await response.json();
    return json.data as TailorIncomeResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Hết thời gian kết nối. Vui lòng thử lại.");
      }
      throw error;
    }
    throw new Error("Lỗi không xác định khi tải dữ liệu thu nhập.");
  }
}

/**
 * Fetch single task detail.
 */
export async function fetchTaskDetail(taskId: string): Promise<TailorTask> {
  const token = await getAuthToken();
  const { controller, timeoutId } = createAbortController();

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/tailor-tasks/${taskId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
        cache: "no-store",
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 404) {
      throw new Error("Không tìm thấy công việc.");
    }

    if (!response.ok) {
      throw new Error(`Lỗi tải chi tiết công việc (HTTP ${response.status})`);
    }

    const json = await response.json();
    return json.data as TailorTask;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Hết thời gian kết nối. Vui lòng thử lại.");
      }
      throw error;
    }
    throw new Error("Lỗi không xác định khi tải chi tiết công việc.");
  }
}
