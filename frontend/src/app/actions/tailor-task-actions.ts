"use server";

/**
 * Server actions for Tailor Task Dashboard (Story 5.3)
 * Tailor/Owner authenticated endpoints.
 */

import { auth } from "@/auth";
import type {
  ActionResult,
  TailorIncomeResponse,
  TailorTask,
  TailorTaskDetailResponse,
  TailorTaskListResponse,
  TailorTaskSummary,
  TaskFilters,
  TaskRejectRequest,
  TaskHoldRequest,
  IncomePeriod,
  TailorIncomeDetailResponse,
} from "@/types/tailor-task";
import type { FittingOutcome, FittingRound } from "@/types/order";

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
 * Supports optional filtering by status, date range, month/year.
 */
export async function fetchMyTasks(filters?: TaskFilters): Promise<TailorTaskListResponse> {
  const token = await getAuthToken();
  const { controller, timeoutId } = createAbortController();

  // Build query string from filters
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.date_from) params.append("date_from", filters.date_from);
  if (filters?.date_to) params.append("date_to", filters.date_to);
  if (filters?.month) params.append("month", filters.month.toString());
  if (filters?.year) params.append("year", filters.year.toString());
  
  const queryString = params.toString();
  const url = `${BACKEND_URL}/api/v1/tailor-tasks/my-tasks${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await fetch(url, {
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
/**
 * Fetch income by period (day/week/month/year).
 * Day returns detailed task list, others return aggregated comparison.
 */
export async function fetchMyIncome(
  period: IncomePeriod = "month",
  referenceDate?: string
): Promise<TailorIncomeResponse | TailorIncomeDetailResponse> {
  const token = await getAuthToken();
  const { controller, timeoutId } = createAbortController();

  // Build query string
  const params = new URLSearchParams();
  params.append("period", period);
  if (referenceDate) {
    params.append("reference_date", referenceDate);
  }
  
  const url = `${BACKEND_URL}/api/v1/tailor-tasks/my-income?${params.toString()}`;

  try {
    const response = await fetch(url, {
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
    
    // Type guard: day period returns TailorIncomeDetailResponse
    if (period === "day") {
      return json.data as TailorIncomeDetailResponse;
    }
    
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
 * Fetch single task detail with stage_logs and history.
 * Returns a result object — errors are returned, not thrown, so the
 * message survives the server-action boundary in production.
 */
export async function fetchTaskDetail(
  taskId: string
): Promise<ActionResult<TailorTaskDetailResponse>> {
  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Chưa đăng nhập. Vui lòng đăng nhập lại.",
    };
  }

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
      return { success: false, error: "Không tìm thấy công việc." };
    }

    if (!response.ok) {
      return { success: false, error: `Lỗi tải chi tiết công việc (HTTP ${response.status})` };
    }

    const json = await response.json();
    return { success: true, data: json.data as TailorTaskDetailResponse };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Hết thời gian kết nối. Vui lòng thử lại." };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi không xác định khi tải chi tiết công việc.",
    };
  }
}


// ── Mutation helper (Story 12.5) ─────────────────────────────────────────────

/**
 * POST a mutation to an API path and return a discriminated result.
 * 409 → { success: false, conflict: true } (optimistic-lock stale version).
 * Never throws — error messages must survive the server-action boundary.
 *
 * opts.verbatim409: surface the backend's own 409 detail instead of the
 * generic optimistic-lock copy — for endpoints whose 409 is a business
 * conflict with specific Vietnamese copy (e.g. approve-alteration duplicate
 * task), not a stale version. Default false: other callers are unchanged.
 */
async function postMutation<T>(
  path: string,
  version?: number,
  body?: Record<string, unknown>,
  opts?: { verbatim409?: boolean },
): Promise<ActionResult<T>> {
  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Chưa đăng nhập. Vui lòng đăng nhập lại.",
    };
  }

  const { controller, timeoutId } = createAbortController();
  try {
    const response = await fetch(
      `${BACKEND_URL}${path}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...(version !== undefined ? { version } : {}), ...body }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);
    if (response.status === 409) {
      const err = opts?.verbatim409
        ? await response.json().catch(() => ({}))
        : null;
      return {
        success: false,
        conflict: true,
        error:
          typeof err?.detail === "string"
            ? err.detail
            : "Dữ liệu đã thay đổi bởi người khác. Vui lòng tải lại.",
      };
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: typeof err?.detail === "string" ? err.detail : `Lỗi ${response.status}`,
      };
    }
    return { success: true, data: (await response.json()).data as T };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Hết thời gian kết nối. Vui lòng thử lại." };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi không xác định.",
    };
  }
}

/** POST a tailor-task mutation (12.5 helper, now delegating to postMutation). */
async function postTaskAction<T>(
  taskId: string,
  action: string,
  version?: number,
  body?: Record<string, unknown>,
): Promise<ActionResult<T>> {
  return postMutation<T>(`/api/v1/tailor-tasks/${taskId}/${action}`, version, body);
}


// ── Cancellation flow actions ─────────────────────────────────────────────


export async function requestTaskCancellation(
  taskId: string,
  failureCategory: string,
  failureReason: string,
  version?: number,
): Promise<ActionResult<TailorTask>> {
  return postTaskAction<TailorTask>(taskId, "request-cancellation", version, {
    failure_category: failureCategory,
    failure_reason: failureReason,
  });
}


export async function resolveCancellation(
  taskId: string,
  decision: "approve" | "reject" | "reassign",
  newTailorId?: string,
  cancellationReason?: string,
): Promise<ActionResult<Record<string, string>>> {
  const body: Record<string, unknown> = { decision };
  if (newTailorId) body.new_tailor_id = newTailorId;
  if (cancellationReason) body.cancellation_reason = cancellationReason;
  return postTaskAction<Record<string, string>>(taskId, "resolve-cancellation", undefined, body);
}


// ── 11-State Machine Actions (Story 12.5) ───────────────────────────────────

export async function acceptTask(taskId: string, version: number): Promise<ActionResult<TailorTask>> {
  return postTaskAction<TailorTask>(taskId, "accept", version);
}

export async function rejectTask(taskId: string, version: number, body: TaskRejectRequest): Promise<ActionResult<TailorTask>> {
  return postTaskAction<TailorTask>(taskId, "reject", version, body as unknown as Record<string, unknown>);
}

export async function startTask(taskId: string, version: number): Promise<ActionResult<TailorTask>> {
  return postTaskAction<TailorTask>(taskId, "start", version);
}

export async function holdTask(taskId: string, version: number, body: TaskHoldRequest): Promise<ActionResult<TailorTask>> {
  return postTaskAction<TailorTask>(taskId, "hold", version, body as unknown as Record<string, unknown>);
}

export async function resumeTask(taskId: string, version: number): Promise<ActionResult<TailorTask>> {
  return postTaskAction<TailorTask>(taskId, "resume", version);
}

export async function submitForQC(taskId: string, version: number): Promise<ActionResult<TailorTask>> {
  return postTaskAction<TailorTask>(taskId, "submit-qc", version);
}

export async function completeStage(
  taskId: string,
  stageOrder: number,
  version: number,
  notes?: string,
): Promise<ActionResult<Record<string, unknown>>> {
  return postTaskAction<Record<string, unknown>>(taskId, `stages/${stageOrder}/complete`, version, notes ? { notes } : undefined);
}

// ── Story 12.6: Fitting round recorder ───────────────────────────────────────

/**
 * Record a fitting round outcome for a bespoke order in production.
 * Owner or the assigned Tailor only. outcome="passed" also completes the
 * fitting stage server-side and starts the next stage.
 */
export async function recordFittingRound(
  orderId: string,
  outcome: FittingOutcome,
  version: number,
  notes?: string,
): Promise<ActionResult<FittingRound>> {
  return postMutation<FittingRound>(
    `/api/v1/orders/${orderId}/fitting-rounds`,
    version,
    { outcome, ...(notes ? { notes } : {}) },
  );
}

// ── Story 12.7: Owner approves a post-delivery alteration request ─────────────

/**
 * Approve a pending alteration request: the backend creates a TailorTask with
 * task_type="alteration" (reduced stage list), clears the pending marker and
 * notifies the customer (+ the assigned tailor when tailor_id is given).
 * verbatim409: the backend's duplicate-open-task 409 copy must reach the
 * owner as-is (it is a business conflict, not an optimistic-lock retry).
 */
export async function approveAlteration(
  orderId: string,
  body: { tailor_id?: string; deadline?: string; notes?: string },
): Promise<ActionResult<TailorTask>> {
  return postMutation<TailorTask>(
    `/api/v1/orders/${orderId}/approve-alteration`,
    undefined,
    body as Record<string, unknown>,
    { verbatim409: true },
  );
}
