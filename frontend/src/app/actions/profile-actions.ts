"use server";

/**
 * Server Actions for Customer Profile self-service (Story 4.4b, 4.4d, 4.4e)
 *
 * Pattern follows garment-actions.ts:
 *  - getAuthToken() → Bearer JWT from session
 *  - 10s timeout via AbortController
 *  - Return { success, data?, error? }
 */

import { auth } from "@/auth";
import type { CustomerProfileDetail, ProfileUpdateInput, PasswordChangeInput, MeasurementResponse } from "@/types/customer";
import type { AppointmentResponse } from "@/types/booking";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 10_000;

async function getAuthToken(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken ?? null;
}

// ──────────────────────────────────────────────
// GET /api/v1/customers/me/profile
// ──────────────────────────────────────────────

export async function getCustomerProfile(): Promise<{
  success: boolean;
  data?: CustomerProfileDetail;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Chưa đăng nhập" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const resp = await fetch(`${BACKEND_URL}/api/v1/customers/me/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (resp.status === 401) return { success: false, error: "Phiên đăng nhập hết hạn" };
    if (!resp.ok) return { success: false, error: "Không thể tải thông tin hồ sơ" };

    const json = await resp.json();
    const profile = json.data;
    if (!profile || typeof profile.email !== "string") {
      return { success: false, error: "Dữ liệu hồ sơ không hợp lệ" };
    }
    return { success: true, data: profile as CustomerProfileDetail };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Yêu cầu quá hạn, vui lòng thử lại" };
    }
    return { success: false, error: "Lỗi kết nối" };
  }
}

// ──────────────────────────────────────────────
// PATCH /api/v1/customers/me/profile
// ──────────────────────────────────────────────

export async function updateCustomerProfile(data: ProfileUpdateInput): Promise<{
  success: boolean;
  data?: CustomerProfileDetail;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Chưa đăng nhập" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    // Include all fields; allow empty strings for clearing phone/gender
    const body: Record<string, string | undefined> = {};
    if (data.full_name !== undefined) body.full_name = data.full_name;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.gender !== undefined) body.gender = data.gender;

    const resp = await fetch(`${BACKEND_URL}/api/v1/customers/me/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (resp.status === 401) return { success: false, error: "Phiên đăng nhập hết hạn" };
    if (resp.status === 422) {
      const err = await resp.json();
      const msg = err.detail?.[0]?.msg ?? "Dữ liệu không hợp lệ";
      return { success: false, error: msg };
    }
    if (!resp.ok) return { success: false, error: "Không thể cập nhật thông tin" };

    const json = await resp.json();
    const updated = json.data;
    if (!updated || typeof updated.email !== "string") {
      return { success: false, error: "Dữ liệu cập nhật không hợp lệ" };
    }
    return { success: true, data: updated as CustomerProfileDetail };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Yêu cầu quá hạn, vui lòng thử lại" };
    }
    return { success: false, error: "Lỗi kết nối" };
  }
}

// ──────────────────────────────────────────────
// POST /api/v1/customers/me/change-password
// ──────────────────────────────────────────────

export async function changePassword(data: Pick<PasswordChangeInput, "old_password" | "new_password">): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Chưa đăng nhập" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const resp = await fetch(`${BACKEND_URL}/api/v1/customers/me/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        old_password: data.old_password,
        new_password: data.new_password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (resp.status === 401) return { success: false, error: "Phiên đăng nhập hết hạn" };

    if (!resp.ok) {
      const err = await resp.json();
      const detail = err.detail;
      if (detail?.code === "WRONG_PASSWORD") {
        return { success: false, error: "Mật khẩu hiện tại không đúng" };
      }
      if (detail?.code === "NO_PASSWORD") {
        return { success: false, error: detail.message };
      }
      if (detail?.code === "WEAK_PASSWORD") {
        return { success: false, error: detail.message };
      }
      return { success: false, error: "Không thể đổi mật khẩu" };
    }

    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Yêu cầu quá hạn, vui lòng thử lại" };
    }
    return { success: false, error: "Lỗi kết nối" };
  }
}

// ──────────────────────────────────────────────
// GET /api/v1/customers/me/measurements
// ──────────────────────────────────────────────

export interface MeasurementsData {
  default_measurement: MeasurementResponse | null;
  measurements: MeasurementResponse[];
  measurement_count: number;
}

// ──────────────────────────────────────────────
// Types for Appointments (Story 4.4e)
// ──────────────────────────────────────────────

export interface AppointmentsData {
  appointments: AppointmentResponse[];
  appointment_count: number;
}

export async function getMyMeasurements(): Promise<{
  success: boolean;
  data?: MeasurementsData;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Chưa đăng nhập" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const resp = await fetch(`${BACKEND_URL}/api/v1/customers/me/measurements`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (resp.status === 401) return { success: false, error: "Phiên đăng nhập hết hạn" };
    if (!resp.ok) return { success: false, error: "Không thể tải số đo" };

    const json = await resp.json();
    const data = json.data as MeasurementsData;
    if (!data || typeof data.measurement_count !== "number") {
      return { success: false, error: "Dữ liệu số đo không hợp lệ" };
    }
    return { success: true, data };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Yêu cầu quá hạn, vui lòng thử lại" };
    }
    return { success: false, error: "Lỗi kết nối" };
  }
}

// ──────────────────────────────────────────────
// GET /api/v1/customers/me/appointments
// ──────────────────────────────────────────────

export async function getMyAppointments(): Promise<{
  success: boolean;
  data?: AppointmentsData;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Chưa đăng nhập" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const resp = await fetch(`${BACKEND_URL}/api/v1/customers/me/appointments`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (resp.status === 401) return { success: false, error: "Phiên đăng nhập hết hạn" };
    if (!resp.ok) return { success: false, error: "Không thể tải lịch hẹn" };

    const json = await resp.json();
    const data = json.data as AppointmentsData;
    if (!data || typeof data.appointment_count !== "number") {
      return { success: false, error: "Dữ liệu lịch hẹn không hợp lệ" };
    }
    return { success: true, data };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Yêu cầu quá hạn, vui lòng thử lại" };
    }
    return { success: false, error: "Lỗi kết nối" };
  }
}

// ──────────────────────────────────────────────
// PATCH /api/v1/customers/me/appointments/{id}/cancel
// ──────────────────────────────────────────────

export async function cancelMyAppointment(appointmentId: string): Promise<{
  success: boolean;
  data?: AppointmentResponse;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Chưa đăng nhập" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const resp = await fetch(
      `${BACKEND_URL}/api/v1/customers/me/appointments/${appointmentId}/cancel`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (resp.status === 401) return { success: false, error: "Phiên đăng nhập hết hạn" };
    if (resp.status === 404) return { success: false, error: "Lịch hẹn không tồn tại" };
    if (resp.status === 409) return { success: false, error: "Lịch hẹn đã được hủy trước đó" };
    if (resp.status === 400) {
      const err = await resp.json();
      return { success: false, error: err.detail?.message ?? "Không thể hủy lịch hẹn" };
    }
    if (!resp.ok) return { success: false, error: "Không thể hủy lịch hẹn" };

    const json = await resp.json();
    return { success: true, data: json.data as AppointmentResponse };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Yêu cầu quá hạn, vui lòng thử lại" };
    }
    return { success: false, error: "Lỗi kết nối" };
  }
}
