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
import type { PatternSessionCreate, PatternSessionResponse } from "@/types/pattern";
import type { MeasurementResponse } from "@/types/customer";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * Get auth token from session
 */
async function getAuthToken(): Promise<string> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("Không có quyền truy cập");
  }
  return session.accessToken;
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
      // Handle specific error codes
      if (response.status === 422) {
        const errorBody = await response.json();
        const detail = errorBody.detail;
        if (Array.isArray(detail)) {
          // Pydantic validation errors
          const messages = detail.map((d: { msg: string }) => d.msg).join("; ");
          return { success: false, error: messages };
        }
        return { success: false, error: detail?.message || "Dữ liệu không hợp lệ" };
      }
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Không có quyền tạo phiên thiết kế" };
      }
      return { success: false, error: "Không thể tạo phiên thiết kế" };
    }

    const result = await response.json();
    return { success: true, data: result.data };
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
 * GET /api/v1/customers/{id}/measurements?default=true
 */
export async function fetchCustomerMeasurement(
  customerId: string
): Promise<{ success: boolean; data?: MeasurementResponse | null; error?: string }> {
  try {
    const token = await getAuthToken();

    const response = await fetch(
      `${BACKEND_URL}/api/v1/customers/${customerId}/measurements?default=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Customer has no measurements - this is valid (AC #3)
        return { success: true, data: null };
      }
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Không có quyền truy cập số đo khách hàng" };
      }
      return { success: false, error: "Không thể tải số đo khách hàng" };
    }

    const result = await response.json();
    return { success: true, data: result.data };
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
