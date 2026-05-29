"use server";

/**
 * Pattern Session Server Actions
 * Story 11.4: Profile-Driven Measurement Form UI
 *
 * Server actions for:
 * - Creating pattern sessions (AC #7)
 * - Fetching customer measurements for auto-fill (AC #2, #3)
 */

import { auth } from "@/auth";
import type { PatternSessionCreate, PatternSessionResponse, AttachPatternResponse, PatternSessionListItem } from "@/types/pattern";
import type { MeasurementResponse } from "@/types/customer";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const MEASUREMENT_NUMBER_FIELDS = [
  "neck",
  "shoulder_width",
  "bust",
  "waist",
  "hip",
  "top_length",
  "ha_eo",
  "vong_nach",
  "sleeve_length",
  "vong_bap_tay",
  "wrist",
  "height",
  "weight",
] as const;
const PATTERN_MEASUREMENT_NUMBER_FIELDS = [
  "do_dai_ao",
  "ha_eo",
  "vong_co",
  "vong_nach",
  "vong_nguc",
  "vong_eo",
  "vong_mong",
  "do_dai_tay",
  "vong_bap_tay",
  "vong_co_tay",
] as const;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUUID(id: string, label: string): void {
  if (!UUID_REGEX.test(id)) {
    throw new Error(`${label} không hợp lệ`);
  }
}

async function getAuthToken(): Promise<string> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("Không có quyền truy cập");
  }
  return session.accessToken;
}

function normalizeMeasurement(measurement: Record<string, unknown>): MeasurementResponse {
  const normalizedMeasurement = {
    ...measurement,
  } as unknown as MeasurementResponse;

  for (const field of MEASUREMENT_NUMBER_FIELDS) {
    const value = measurement[field];
    if (typeof value === "string") {
      const parsedValue = Number(value);
      normalizedMeasurement[field] = Number.isFinite(parsedValue) ? parsedValue : null;
    }
  }

  return normalizedMeasurement;
}

function normalizePatternSession(session: Record<string, unknown>): PatternSessionResponse {
  const normalizedSession = {
    ...session,
  } as unknown as PatternSessionResponse;

  for (const field of PATTERN_MEASUREMENT_NUMBER_FIELDS) {
    const value = session[field];
    if (typeof value === "string") {
      const parsedValue = Number(value);
      if (Number.isFinite(parsedValue)) {
        normalizedSession[field] = parsedValue;
      }
    }
  }

  return normalizedSession;
}

function pickDefaultMeasurement(payload: unknown): MeasurementResponse | null {
  let measurements: Record<string, unknown>[] = [];

  if (Array.isArray(payload)) {
    measurements = payload.filter(
      (measurement): measurement is Record<string, unknown> =>
        typeof measurement === "object" && measurement !== null
    );
  } else if (payload && typeof payload === "object") {
    const payloadData = (payload as { data?: unknown }).data;
    if (Array.isArray(payloadData)) {
      measurements = payloadData.filter(
        (measurement): measurement is Record<string, unknown> =>
          typeof measurement === "object" && measurement !== null
      );
    } else if (payloadData && typeof payloadData === "object") {
      measurements = [payloadData as Record<string, unknown>];
    } else if ("is_default" in payload) {
      measurements = [payload as Record<string, unknown>];
    }
  }

  if (measurements.length === 0) {
    return null;
  }

  const defaultMeasurement =
    measurements.find((measurement) => measurement.is_default === true) ?? measurements[0];

  return normalizeMeasurement(defaultMeasurement);
}

/**
 * Create a new pattern session (AC #7)
 * POST /api/v1/patterns/sessions
 */
export async function createPatternSession(
  data: PatternSessionCreate
): Promise<{ success: boolean; data?: PatternSessionResponse; error?: string }> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${BACKEND_URL}/api/v1/patterns/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 422) {
        try {
          const errorBody = await response.json();
          const detail = errorBody.detail;
          if (Array.isArray(detail)) {
            const messages = detail.map((d: { msg: string }) => d.msg).join("; ");
            return { success: false, error: messages };
          }
          return { success: false, error: detail?.message || "Dữ liệu không hợp lệ" };
        } catch {
          return { success: false, error: "Dữ liệu không hợp lệ" };
        }
      }
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Không có quyền tạo phiên thiết kế" };
      }
      return { success: false, error: "Không thể tạo phiên thiết kế" };
    }

    const result = await response.json();
    return {
      success: true,
      data:
        result?.data && typeof result.data === "object"
          ? normalizePatternSession(result.data as Record<string, unknown>)
          : result.data,
    };
  } catch (error) {
    console.error("Error creating pattern session:", error);
    if (error instanceof Error && error.message === "Không có quyền truy cập") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ" };
  }
}

/**
 * Fetch customer's default measurement for auto-fill (AC #2, #3)
 * GET /api/v1/customers/{id}/measurements
 */
export async function fetchCustomerMeasurement(
  customerId: string
): Promise<{ success: boolean; data?: MeasurementResponse | null; error?: string }> {
  try {
    assertUUID(customerId, "Customer ID");
    const token = await getAuthToken();

    const response = await fetch(`${BACKEND_URL}/api/v1/customers/${customerId}/measurements`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        let body: { detail?: string } | null = null;
        try { body = await response.json(); } catch { /* non-JSON 404 */ }
        const detail = body?.detail ?? "";
        if (/customer/i.test(detail) && /not found/i.test(detail)) {
          return { success: false, error: "Khách hàng không tồn tại" };
        }
        return { success: true, data: null };
      }
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Không có quyền truy cập số đo khách hàng" };
      }
      return { success: false, error: "Không thể tải số đo khách hàng" };
    }

    const result = await response.json();
    return { success: true, data: pickDefaultMeasurement(result) };
  } catch (error) {
    console.error("Error fetching customer measurement:", error);
    if (error instanceof Error && error.message === "Không có quyền truy cập") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ" };
  }
}

/**
 * Search customers by name or phone (AC #1)
 * GET /api/v1/customers?search={query}
 */
export async function searchCustomers(
  query: string
): Promise<{
  success: boolean;
  data?: Array<{ id: string; full_name: string; phone: string }>;
  error?: string;
}> {
  try {
    const token = await getAuthToken();

    const params = new URLSearchParams({
      search: query,
      limit: "10",
    });

    const response = await fetch(`${BACKEND_URL}/api/v1/customers?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Không có quyền tìm kiếm khách hàng" };
      }
      return { success: false, error: "Không thể tìm kiếm khách hàng" };
    }

    const result = await response.json();
    const customers = result.customers || [];

    return {
      success: true,
      data: customers.map((c: { id: string; full_name: string; phone: string }) => ({
        id: c.id,
        full_name: c.full_name,
        phone: c.phone,
      })),
    };
  } catch (error) {
    console.error("Error searching customers:", error);
    if (error instanceof Error && error.message === "Không có quyền truy cập") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ" };
  }
}

// ===== Story 11.6: Attach/detach pattern + list customer sessions =====

export async function attachPatternToOrder(
  orderId: string,
  patternSessionId: string
): Promise<{ success: boolean; data?: AttachPatternResponse; error?: string }> {
  try {
    assertUUID(orderId, "Order ID");
    assertUUID(patternSessionId, "Pattern session ID");
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/v1/orders/${orderId}/attach-pattern`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pattern_session_id: patternSessionId }),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Đơn hàng hoặc phiên thiết kế không tồn tại" };
      }
      if (response.status === 422) {
        try {
          const body = await response.json();
          return { success: false, error: body.detail?.message || "Không thể đính kèm rập" };
        } catch {
          return { success: false, error: "Không thể đính kèm rập" };
        }
      }
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Không có quyền thực hiện" };
      }
      return { success: false, error: "Không thể đính kèm rập" };
    }

    const result = await response.json();
    return {
      success: true,
      data:
        result?.data && typeof result.data === "object"
          ? normalizePatternSession(result.data as Record<string, unknown>)
          : result.data,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Không có quyền truy cập") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ" };
  }
}

export async function detachPatternFromOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    assertUUID(orderId, "Order ID");
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/v1/orders/${orderId}/attach-pattern`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pattern_session_id: null }),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Đơn hàng không tồn tại" };
      }
      if (response.status === 422) {
        try {
          const body = await response.json();
          return { success: false, error: body.detail?.message || "Không thể gỡ rập" };
        } catch {
          return { success: false, error: "Không thể gỡ rập" };
        }
      }
      return { success: false, error: "Không thể gỡ rập" };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "Không có quyền truy cập") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ" };
  }
}

export async function fetchCustomerPatternSessions(
  customerId: string
): Promise<{ success: boolean; data?: PatternSessionListItem[]; error?: string }> {
  try {
    assertUUID(customerId, "Customer ID");
    const token = await getAuthToken();
    const params = new URLSearchParams({
      customer_id: customerId,
      status: "completed,exported",
    });
    const response = await fetch(`${BACKEND_URL}/api/v1/patterns/sessions?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Không có quyền truy cập" };
      }
      return { success: false, error: "Không thể tải danh sách phiên thiết kế" };
    }

    const result = await response.json();
    const sessions: PatternSessionListItem[] = (result.data || []).map(
      (s: { id: string; status: string; garment_type: string; pieces?: unknown[]; piece_count?: number; created_at: string }) => ({
        id: s.id,
        status: s.status as PatternSessionListItem["status"],
        garment_type: s.garment_type,
        piece_count: s.piece_count ?? (Array.isArray(s.pieces) ? s.pieces.length : 0),
        created_at: s.created_at,
      })
    );
    return { success: true, data: sessions };
  } catch (error) {
    if (error instanceof Error && error.message === "Không có quyền truy cập") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ" };
  }
}

// ===== Story 11.5: Session detail + generate + export =====

export async function fetchPatternSession(
  sessionId: string
): Promise<{ success: boolean; data?: PatternSessionResponse | null; error?: string; statusCode?: number }> {
  try {
    assertUUID(sessionId, "Session ID");
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/v1/patterns/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Phiên thiết kế không tồn tại", statusCode: 404 };
      }
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Không có quyền truy cập", statusCode: response.status };
      }
      return { success: false, error: "Không thể tải phiên thiết kế", statusCode: response.status };
    }

    const result = await response.json();
    return {
      success: true,
      data:
        result?.data && typeof result.data === "object"
          ? normalizePatternSession(result.data as Record<string, unknown>)
          : result.data,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Không có quyền truy cập") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ" };
  }
}

export async function fetchCustomerDetail(
  customerId: string
): Promise<{ success: boolean; data?: { full_name: string } | null; error?: string }> {
  try {
    assertUUID(customerId, "Customer ID");
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/v1/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Khách hàng không tồn tại" };
      }
      return { success: false, error: "Không thể tải thông tin khách hàng" };
    }

    const result = await response.json();
    return { success: true, data: { full_name: result.data?.full_name ?? result.full_name ?? null } };
  } catch (error) {
    if (error instanceof Error && error.message === "Không có quyền truy cập") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ" };
  }
}

export async function generatePatternPieces(
  sessionId: string
): Promise<{ success: boolean; data?: PatternSessionResponse; error?: string }> {
  try {
    assertUUID(sessionId, "Session ID");
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/v1/patterns/sessions/${sessionId}/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 422) {
        const body = await response.json();
        return { success: false, error: body.detail?.message || "Không thể tạo mẫu rập" };
      }
      return { success: false, error: "Không thể tạo mẫu rập" };
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    if (error instanceof Error && error.message === "Không có quyền truy cập") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ" };
  }
}

export async function exportPatternPiece(
  pieceId: string,
  format: string,
  speed?: number,
  power?: number
): Promise<{ success: boolean; data?: { content: string; filename: string; contentType: string }; error?: string }> {
  try {
    assertUUID(pieceId, "Piece ID");
    const token = await getAuthToken();
    const params = new URLSearchParams({ format });
    if (speed != null) params.set("speed", String(speed));
    if (power != null) params.set("power", String(power));

    const response = await fetch(
      `${BACKEND_URL}/api/v1/patterns/pieces/${pieceId}/export?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      return { success: false, error: "Không thể xuất file" };
    }

    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    const ext = format === "svg" ? "svg" : "gcode";
    return {
      success: true,
      data: {
        content: buffer.toString("base64"),
        filename: `pattern-piece-${pieceId.slice(0, 8)}.${ext}`,
        contentType: blob.type || (format === "svg" ? "image/svg+xml" : "application/octet-stream"),
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Không có quyền truy cập") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ" };
  }
}

export async function exportPatternSession(
  sessionId: string,
  format: string,
  speed?: number,
  power?: number
): Promise<{ success: boolean; data?: { content: string; filename: string; contentType: string }; error?: string }> {
  try {
    assertUUID(sessionId, "Session ID");
    const token = await getAuthToken();
    const params = new URLSearchParams({ format });
    if (speed != null) params.set("speed", String(speed));
    if (power != null) params.set("power", String(power));

    const response = await fetch(
      `${BACKEND_URL}/api/v1/patterns/sessions/${sessionId}/export?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      return { success: false, error: "Không thể xuất toàn bộ mảnh rập" };
    }

    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    return {
      success: true,
      data: {
        content: buffer.toString("base64"),
        filename: `pattern-session-${sessionId.slice(0, 8)}.zip`,
        contentType: blob.type || "application/zip",
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Không có quyền truy cập") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ" };
  }
}
