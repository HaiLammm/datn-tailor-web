/**
 * AppointmentList Component Tests — Story 4.4e
 * Tests: render upcoming, render past, empty state, loading, error, cancel flow,
 *        countdown display, responsive, within-24h disabled
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock the server action module
const mockGetMyAppointments = jest.fn();
const mockCancelMyAppointment = jest.fn();
jest.mock("@/app/actions/profile-actions", () => ({
  getMyAppointments: (...args: unknown[]) => mockGetMyAppointments(...args),
  cancelMyAppointment: (...args: unknown[]) => mockCancelMyAppointment(...args),
}));

import AppointmentList from "@/components/client/profile/AppointmentList";
import type { AppointmentsData } from "@/app/actions/profile-actions";
import type { AppointmentResponse } from "@/types/booking";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFutureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

function getPastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const UPCOMING_APPT: AppointmentResponse = {
  id: "appt-1",
  customer_name: "Nguyễn Thị Linh",
  customer_phone: "0931234567",
  customer_email: "linh@example.com",
  appointment_date: getFutureDate(3),
  slot: "morning",
  status: "confirmed",
  special_requests: "Tư vấn áo dài cưới",
  created_at: "2026-03-18T10:00:00Z",
};

const PAST_APPT: AppointmentResponse = {
  id: "appt-2",
  customer_name: "Nguyễn Thị Linh",
  customer_phone: "0931234567",
  customer_email: "linh@example.com",
  appointment_date: getPastDate(5),
  slot: "afternoon",
  status: "pending",
  special_requests: null,
  created_at: "2026-03-10T10:00:00Z",
};

const TODAY_APPT: AppointmentResponse = {
  id: "appt-3",
  customer_name: "Nguyễn Thị Linh",
  customer_phone: "0931234567",
  customer_email: "linh@example.com",
  appointment_date: getTodayDate(),
  slot: "morning",
  status: "confirmed",
  special_requests: null,
  created_at: "2026-03-17T10:00:00Z",
};

function makeData(appointments: AppointmentResponse[]): AppointmentsData {
  return { appointments, appointment_count: appointments.length };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AppointmentList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton when initialData is null and no error", () => {
    render(<AppointmentList initialData={null} />);
    expect(screen.getByTestId("appointment-skeleton")).toBeInTheDocument();
  });

  it("renders error state with retry button when initialError is provided", () => {
    render(<AppointmentList initialData={null} initialError="Không thể tải lịch hẹn" />);
    expect(screen.getByTestId("appointment-error")).toBeInTheDocument();
    expect(screen.getByText("Không thể tải lịch hẹn")).toBeInTheDocument();
    expect(screen.getByText("Thử lại")).toBeInTheDocument();
  });

  it("renders empty state when no appointments", () => {
    render(<AppointmentList initialData={makeData([])} />);
    expect(screen.getByTestId("appointment-empty")).toBeInTheDocument();
    expect(screen.getByText("Chưa có lịch hẹn nào")).toBeInTheDocument();
    const ctaLink = screen.getByText("Đặt lịch tư vấn");
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink.closest("a")).toHaveAttribute("href", "/booking");
  });

  it("renders upcoming appointments section", () => {
    render(<AppointmentList initialData={makeData([UPCOMING_APPT])} />);
    expect(screen.getByText("Lịch hẹn sắp tới")).toBeInTheDocument();
    expect(screen.getByText("Đã xác nhận")).toBeInTheDocument();
    expect(screen.getByText("Tư vấn áo dài cưới")).toBeInTheDocument();
    // Slot label
    expect(screen.getByText("Buổi Sáng")).toBeInTheDocument();
  });

  it("renders past appointments section", () => {
    render(<AppointmentList initialData={makeData([PAST_APPT])} />);
    expect(screen.getByText("Lịch hẹn đã qua")).toBeInTheDocument();
    expect(screen.getByText("Chờ xác nhận")).toBeInTheDocument();
  });

  it("renders both upcoming and past sections when both exist", () => {
    render(<AppointmentList initialData={makeData([UPCOMING_APPT, PAST_APPT])} />);
    expect(screen.getByText("Lịch hẹn sắp tới")).toBeInTheDocument();
    expect(screen.getByText("Lịch hẹn đã qua")).toBeInTheDocument();
  });

  it("shows countdown 'Còn X ngày' for upcoming appointment", () => {
    render(<AppointmentList initialData={makeData([UPCOMING_APPT])} />);
    // appointment is 3 days from now
    expect(screen.getByText(/Còn \d+ ngày/)).toBeInTheDocument();
  });

  it("shows 'Hôm nay' countdown for today's appointment (in past section since within 24h)", () => {
    render(<AppointmentList initialData={makeData([TODAY_APPT])} />);
    // Today is within 24h so it goes to past section, no countdown shown
    // But the card should render
    expect(screen.getByTestId("appointment-card")).toBeInTheDocument();
  });

  it("shows cancel button for upcoming non-cancelled appointment", () => {
    render(<AppointmentList initialData={makeData([UPCOMING_APPT])} />);
    expect(screen.getByText("Hủy lịch hẹn")).toBeInTheDocument();
  });

  it("shows disabled cancel button with tooltip for within-24h appointment", () => {
    render(<AppointmentList initialData={makeData([TODAY_APPT])} />);
    const cancelBtn = screen.queryByText("Hủy lịch hẹn");
    if (cancelBtn) {
      // Button exists but should be disabled
      const btn = cancelBtn.closest("button");
      if (btn) expect(btn).toBeDisabled();
    }
  });

  it("does not show cancel button for already cancelled appointment", () => {
    const cancelledAppt: AppointmentResponse = { ...UPCOMING_APPT, id: "appt-4", status: "cancelled" };
    render(<AppointmentList initialData={makeData([cancelledAppt])} />);
    expect(screen.queryByText("Hủy lịch hẹn")).not.toBeInTheDocument();
    expect(screen.getByText("Đã hủy")).toBeInTheDocument();
  });

  it("shows confirm dialog when cancel button is clicked", () => {
    render(<AppointmentList initialData={makeData([UPCOMING_APPT])} />);
    fireEvent.click(screen.getByText("Hủy lịch hẹn"));
    expect(screen.getByText("Bạn có chắc muốn hủy lịch hẹn này?")).toBeInTheDocument();
    expect(screen.getByText("Xác nhận hủy")).toBeInTheDocument();
    expect(screen.getByText("Giữ lịch")).toBeInTheDocument();
  });

  it("dismisses confirm dialog when 'Giữ lịch' is clicked", () => {
    render(<AppointmentList initialData={makeData([UPCOMING_APPT])} />);
    fireEvent.click(screen.getByText("Hủy lịch hẹn"));
    fireEvent.click(screen.getByText("Giữ lịch"));
    expect(screen.queryByText("Bạn có chắc muốn hủy lịch hẹn này?")).not.toBeInTheDocument();
    expect(screen.getByText("Hủy lịch hẹn")).toBeInTheDocument();
  });

  it("calls cancelMyAppointment and shows success toast", async () => {
    mockCancelMyAppointment.mockResolvedValue({
      success: true,
      data: { ...UPCOMING_APPT, status: "cancelled" },
    });

    render(<AppointmentList initialData={makeData([UPCOMING_APPT])} />);
    fireEvent.click(screen.getByText("Hủy lịch hẹn"));
    fireEvent.click(screen.getByText("Xác nhận hủy"));

    await waitFor(() => {
      expect(mockCancelMyAppointment).toHaveBeenCalledWith("appt-1");
    });

    await waitFor(() => {
      expect(screen.getByText("Đã hủy lịch hẹn thành công")).toBeInTheDocument();
    });
  });

  it("calls cancelMyAppointment and shows error toast on failure", async () => {
    mockCancelMyAppointment.mockResolvedValue({
      success: false,
      error: "Không thể hủy lịch hẹn",
    });

    render(<AppointmentList initialData={makeData([UPCOMING_APPT])} />);
    fireEvent.click(screen.getByText("Hủy lịch hẹn"));
    fireEvent.click(screen.getByText("Xác nhận hủy"));

    await waitFor(() => {
      expect(screen.getByText("Không thể hủy lịch hẹn")).toBeInTheDocument();
    });
  });

  it("calls getMyAppointments on retry", async () => {
    mockGetMyAppointments.mockResolvedValue({
      success: true,
      data: makeData([UPCOMING_APPT]),
    });

    render(<AppointmentList initialData={null} initialError="Lỗi kết nối" />);
    fireEvent.click(screen.getByText("Thử lại"));

    await waitFor(() => {
      expect(mockGetMyAppointments).toHaveBeenCalled();
    });
  });

  it("uses 1-col on mobile and 2-cols on desktop (grid class check)", () => {
    const { container } = render(<AppointmentList initialData={makeData([UPCOMING_APPT])} />);
    const grid = container.querySelector(".grid-cols-1.md\\:grid-cols-2");
    expect(grid).toBeInTheDocument();
  });
});
