"use server";

/**
 * Server actions for Owner Appointment management.
 * Owner views and manages all tenant appointments.
 */

import { auth } from "@/auth";
import type { AppointmentResponse } from "@/types/booking";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 10000;

export interface AppointmentListData {
  appointments: AppointmentResponse[];
  appointment_count: number;
}

export interface AppointmentListResult {
  success: boolean;
  data?: AppointmentListData;
  error?: string;
}

export interface AppointmentActionResult {
  success: boolean;
  data?: AppointmentResponse;
  error?: string;
}

export interface AppointmentFilterParams {
  status?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Fetch all tenant appointments (Owner only).
 */
export async function fetchTenantAppointments(
  params: AppointmentFilterParams = {}
): Promise<AppointmentListResult> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) return { success: false, error: "Chưa đăng nhập. Vui lòng đăng nhập lại." };

  const url = new URL(`${BACKEND_URL}/api/v1/appointments/tenant`);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.date_from) url.searchParams.set("date_from", params.date_from);
  if (params.date_to) url.searchParams.set("date_to", params.date_to);

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

    if (response.status === 401) {
      return { success: false, error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
    }
    if (response.status === 403) {
      return { success: false, error: "Bạn không có quyền truy cập chức năng này." };
    }
    if (!response.ok) {
      return { success: false, error: `Lỗi máy chủ (HTTP ${response.status})` };
    }

    const result = await response.json();
    return { success: true, data: result.data as AppointmentListData };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Yêu cầu hết thời gian. Vui lòng thử lại." };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
  }
}

/**
 * Confirm a pending appointment (Owner only).
 */
export async function confirmAppointment(
  appointmentId: string
): Promise<AppointmentActionResult> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) return { success: false, error: "Chưa đăng nhập. Vui lòng đăng nhập lại." };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/appointments/tenant/${appointmentId}/confirm`,
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

    if (response.status === 404) {
      return { success: false, error: "Lịch hẹn không tồn tại." };
    }
    if (response.status === 400) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err?.detail?.message || "Không thể xác nhận lịch hẹn này." };
    }
    if (!response.ok) {
      return { success: false, error: `Lỗi máy chủ (HTTP ${response.status})` };
    }

    const result = await response.json();
    return { success: true, data: result.data as AppointmentResponse };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Yêu cầu hết thời gian. Vui lòng thử lại." };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
  }
}

/**
 * Cancel an appointment (Owner only — no 24h restriction).
 */
export async function cancelAppointmentOwner(
  appointmentId: string
): Promise<AppointmentActionResult> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) return { success: false, error: "Chưa đăng nhập. Vui lòng đăng nhập lại." };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/appointments/tenant/${appointmentId}/cancel`,
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

    if (response.status === 404) {
      return { success: false, error: "Lịch hẹn không tồn tại." };
    }
    if (response.status === 409) {
      return { success: false, error: "Lịch hẹn đã được hủy trước đó." };
    }
    if (!response.ok) {
      return { success: false, error: `Lỗi máy chủ (HTTP ${response.status})` };
    }

    const result = await response.json();
    return { success: true, data: result.data as AppointmentResponse };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Yêu cầu hết thời gian. Vui lòng thử lại." };
    }
    return { success: false, error: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
  }
}
