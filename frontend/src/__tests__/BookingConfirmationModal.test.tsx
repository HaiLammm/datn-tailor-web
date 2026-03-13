/**
 * BookingConfirmationModal Tests - Story 3.4: Success modal after booking.
 * Tests rendering, appointment details display, accessibility, and user interactions.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock useFocusTrap
jest.mock("@/utils/useFocusTrap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

import BookingConfirmationModal from "@/components/client/booking/BookingConfirmationModal";
import type { AppointmentResponse } from "@/types/booking";

const MOCK_APPOINTMENT: AppointmentResponse = {
  id: "appt-uuid-123",
  customer_name: "Nguyễn Thị Lan",
  customer_phone: "0912345678",
  customer_email: "lan@test.com",
  appointment_date: "2026-06-15",
  slot: "morning",
  status: "pending",
  special_requests: null,
  created_at: "2026-06-01T10:00:00Z",
};

describe("BookingConfirmationModal", () => {
  let onClose: jest.Mock;

  beforeEach(() => {
    onClose = jest.fn();
  });

  afterEach(() => {
    // Restore body overflow
    document.body.style.overflow = "";
  });

  it("renders success title", () => {
    render(
      <BookingConfirmationModal appointment={MOCK_APPOINTMENT} onClose={onClose} />
    );
    expect(screen.getByText("Đặt Lịch Thành Công!")).toBeInTheDocument();
  });

  it("displays customer name in appointment details", () => {
    render(
      <BookingConfirmationModal appointment={MOCK_APPOINTMENT} onClose={onClose} />
    );
    expect(screen.getByText("Nguyễn Thị Lan")).toBeInTheDocument();
  });

  it("displays formatted appointment date (dd/MM/yyyy)", () => {
    render(
      <BookingConfirmationModal appointment={MOCK_APPOINTMENT} onClose={onClose} />
    );
    expect(screen.getByText("15/06/2026")).toBeInTheDocument();
  });

  it("displays morning slot label in Vietnamese", () => {
    render(
      <BookingConfirmationModal appointment={MOCK_APPOINTMENT} onClose={onClose} />
    );
    expect(screen.getByText("Buổi Sáng (9:00 - 12:00)")).toBeInTheDocument();
  });

  it("displays afternoon slot label when slot is afternoon", () => {
    const afternoonAppt = { ...MOCK_APPOINTMENT, slot: "afternoon" as const };
    render(
      <BookingConfirmationModal appointment={afternoonAppt} onClose={onClose} />
    );
    expect(screen.getByText("Buổi Chiều (13:00 - 17:00)")).toBeInTheDocument();
  });

  it("displays customer email confirmation message", () => {
    render(
      <BookingConfirmationModal appointment={MOCK_APPOINTMENT} onClose={onClose} />
    );
    expect(screen.getByText("lan@test.com")).toBeInTheDocument();
  });

  it("renders 'Về Trang Chủ' and 'Xem Lịch Hẹn' CTAs", () => {
    render(
      <BookingConfirmationModal appointment={MOCK_APPOINTMENT} onClose={onClose} />
    );
    expect(screen.getByText("Về Trang Chủ")).toBeInTheDocument();
    expect(screen.getByText("Xem Lịch Hẹn")).toBeInTheDocument();
  });

  it("has correct href for CTAs", () => {
    render(
      <BookingConfirmationModal appointment={MOCK_APPOINTMENT} onClose={onClose} />
    );
    expect(screen.getByText("Về Trang Chủ").closest("a")).toHaveAttribute(
      "href",
      "/"
    );
    expect(screen.getByText("Xem Lịch Hẹn").closest("a")).toHaveAttribute(
      "href",
      "/profile/appointments"
    );
  });

  it("calls onClose when Escape key is pressed", () => {
    render(
      <BookingConfirmationModal appointment={MOCK_APPOINTMENT} onClose={onClose} />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    render(
      <BookingConfirmationModal appointment={MOCK_APPOINTMENT} onClose={onClose} />
    );
    const backdrop = document.querySelector("[aria-hidden='true']");
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has correct aria attributes for dialog", () => {
    render(
      <BookingConfirmationModal appointment={MOCK_APPOINTMENT} onClose={onClose} />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "booking-confirm-title");
  });

  it("locks body scroll when mounted", () => {
    render(
      <BookingConfirmationModal appointment={MOCK_APPOINTMENT} onClose={onClose} />
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("displays special requests when provided", () => {
    const apptWithNotes = {
      ...MOCK_APPOINTMENT,
      special_requests: "Tôi muốn tư vấn áo cưới",
    };
    render(
      <BookingConfirmationModal appointment={apptWithNotes} onClose={onClose} />
    );
    expect(screen.getByText("Tôi muốn tư vấn áo cưới")).toBeInTheDocument();
    expect(screen.getByText("Yêu cầu đặc biệt")).toBeInTheDocument();
  });
});
