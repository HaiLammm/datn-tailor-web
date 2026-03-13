/**
 * Booking Page - Story 3.4: Lịch Book Appointments Tiệm & Khách.
 *
 * Server Component: Fetches initial month availability server-side,
 * then passes to BookingClient for interactive calendar rendering.
 *
 * Route: /booking — Boutique Mode (customer layout)
 */

import BookingClient from "@/components/client/booking/BookingClient";
import type { MonthAvailability } from "@/types/booking";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

async function fetchMonthAvailability(
  year: number,
  month: number
): Promise<MonthAvailability> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/appointments/availability?year=${year}&month=${month}`,
      { cache: "no-store" }
    );
    if (!res.ok) return {};
    const json = await res.json();
    return (json.data as MonthAvailability) || {};
  } catch {
    return {};
  }
}

export default async function BookingPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const initialAvailability = await fetchMonthAvailability(year, month);

  return (
    <BookingClient
      initialYear={year}
      initialMonth={month}
      initialAvailability={initialAvailability}
    />
  );
}

export const metadata = {
  title: "Đặt Lịch Tư Vấn Bespoke | Tailor Project",
  description:
    "Đặt lịch hẹn tư vấn Bespoke tại tiệm may áo dài. Chọn ngày và khung giờ phù hợp.",
};
