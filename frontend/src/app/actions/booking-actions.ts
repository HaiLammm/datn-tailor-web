"use server";

/**
 * Server actions for Appointment Booking - Story 3.4: Lịch Book Appointments.
 * Public endpoint — no authentication required (guest booking).
 */

import type {
  AppointmentResponse,
  CreateAppointmentInput,
  MonthAvailability,
} from "@/types/booking";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 10000;

/**
 * Get slot availability for all days in a given month.
 * Used by BookingCalendar to render available/unavailable day states.
 */
export async function getMonthAvailability(
  year: number,
  month: number
): Promise<{ success: boolean; data?: MonthAvailability; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/appointments/availability?year=${year}&month=${month}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        cache: "no-store",
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`getMonthAvailability: HTTP ${response.status}`);
      return {
        success: false,
        error: `Không thể tải lịch (HTTP ${response.status})`,
      };
    }

    const result = await response.json();
    return { success: true, data: result.data as MonthAvailability };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: "Yêu cầu hết thời gian. Vui lòng thử lại.",
        };
      }
      console.error("getMonthAvailability error:", error.message);
      return { success: false, error: error.message };
    }
    return { success: false, error: "Lỗi không xác định" };
  }
}

/**
 * Create a new Bespoke consultation appointment.
 * Returns slot_taken error code for race condition (slot fully booked).
 */
export async function createAppointment(
  input: CreateAppointmentInput
): Promise<{
  success: boolean;
  data?: AppointmentResponse;
  error?: string;
  errorCode?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 409) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData?.detail?.error?.message ||
        (typeof errorData?.detail === "string" ? errorData.detail : null) ||
        "Khung giờ này vừa được đặt, vui lòng chọn slot khác.";
      console.error("createAppointment: 409 Slot taken");
      return { success: false, error: msg, errorCode: "slot_taken" };
    }

    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData?.detail?.error?.message ||
        (typeof errorData?.detail === "string" ? errorData.detail : null) ||
        "Dữ liệu không hợp lệ";
      console.error("createAppointment: 400 Bad Request", errorData);
      return { success: false, error: msg };
    }

    if (!response.ok) {
      console.error(`createAppointment: HTTP ${response.status}`);
      return {
        success: false,
        error: `Lỗi máy chủ (HTTP ${response.status}). Vui lòng thử lại.`,
      };
    }

    const result = await response.json();
    return { success: true, data: result.data as AppointmentResponse };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: "Yêu cầu hết thời gian. Vui lòng thử lại.",
        };
      }
      console.error("createAppointment error:", error.message);
      return { success: false, error: error.message };
    }
    return { success: false, error: "Lỗi không xác định" };
  }
}
