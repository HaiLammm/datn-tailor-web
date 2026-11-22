/**
 * TypeScript types for Appointment Booking domain (Story 3.4).
 * Lịch Book Appointments Tiệm & Khách (Calendar UI).
 */

export type AppointmentSlot = "morning" | "afternoon";
export type AppointmentStatus = "pending" | "confirmed" | "cancelled";
export type AppointmentService = "may_do" | "thue" | "mua" | "ao_cuoi" | "chua_ro";

/** Nhãn hiển thị — khớp SERVICE_LABELS ở backend/src/models/appointment.py */
export const APPOINTMENT_SERVICE_OPTIONS: { value: AppointmentService; label: string }[] = [
  { value: "may_do", label: "May đo" },
  { value: "thue", label: "Thuê áo" },
  { value: "mua", label: "Mua áo may sẵn" },
  { value: "ao_cuoi", label: "Áo dài cưới" },
  { value: "chua_ro", label: "Chưa rõ, cần tư vấn" },
];

export interface SlotAvailability {
  date: string; // YYYY-MM-DD
  morning_available: boolean;
  morning_remaining: number;
  afternoon_available: boolean;
  afternoon_remaining: number;
}

/** Keyed by 'YYYY-MM-DD' for fast calendar lookups */
export type MonthAvailability = Record<string, SlotAvailability>;

export interface CreateAppointmentInput {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  appointment_date: string; // YYYY-MM-DD
  slot: AppointmentSlot;
  service_type?: AppointmentService;
  special_requests?: string;
}

export interface AppointmentResponse {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  appointment_date: string; // YYYY-MM-DD
  slot: AppointmentSlot;
  status: AppointmentStatus;
  special_requests?: string | null;
  created_at: string;
}
