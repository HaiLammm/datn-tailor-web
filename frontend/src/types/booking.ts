/**
 * TypeScript types for Appointment Booking domain (Story 3.4).
 * Lịch Book Appointments Tiệm & Khách (Calendar UI).
 */

export type AppointmentSlot = "morning" | "afternoon";
export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

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
  customer_email: string;
  appointment_date: string; // YYYY-MM-DD
  slot: AppointmentSlot;
  special_requests?: string;
}

export interface AppointmentResponse {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  appointment_date: string; // YYYY-MM-DD
  slot: AppointmentSlot;
  status: AppointmentStatus;
  special_requests?: string | null;
  created_at: string;
}
