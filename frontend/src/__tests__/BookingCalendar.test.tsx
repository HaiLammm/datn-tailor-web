/**
 * BookingCalendar Tests - Story 3.4: Lịch Book Appointments
 * Tests calendar rendering, date states, month/week navigation, and selection.
 * Tests both desktop (month view) and mobile (week view) modes.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock framer-motion to avoid animation complexity in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import BookingCalendar from "@/components/client/booking/BookingCalendar";
import type { MonthAvailability } from "@/types/booking";

const MOCK_AVAILABILITY: MonthAvailability = {
  "2026-06-10": {
    date: "2026-06-10",
    morning_available: true,
    morning_remaining: 3,
    afternoon_available: true,
    afternoon_remaining: 2,
  },
  "2026-06-11": {
    date: "2026-06-11",
    morning_available: false,
    morning_remaining: 0,
    afternoon_available: false,
    afternoon_remaining: 0,
  },
  "2026-06-15": {
    date: "2026-06-15",
    morning_available: true,
    morning_remaining: 1,
    afternoon_available: false,
    afternoon_remaining: 0,
  },
};

const defaultProps = {
  monthAvailability: MOCK_AVAILABILITY,
  selectedDate: null,
  onDateSelect: jest.fn(),
  currentMonth: { year: 2026, month: 6 },
  onMonthChange: jest.fn(),
};

/** Helper to set window.innerWidth and trigger resize */
function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

describe("BookingCalendar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to desktop viewport
    setViewport(1024);
  });

  afterEach(() => {
    setViewport(1024);
  });

  describe("Desktop (Month View)", () => {
    it("renders month name and year in header", () => {
      render(<BookingCalendar {...defaultProps} />);
      expect(screen.getByText(/Tháng 6 2026/i)).toBeInTheDocument();
    });

    it("renders weekday labels T2 through CN", () => {
      render(<BookingCalendar {...defaultProps} />);
      ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it("renders all 30 days of June in month view", () => {
      render(<BookingCalendar {...defaultProps} />);
      // June has 30 days — count day buttons
      const dayButtons = screen.getAllByRole("button").filter(
        (btn) => btn.getAttribute("aria-label")?.includes("tháng")
      );
      expect(dayButtons).toHaveLength(30);
    });

    it("calls onMonthChange with previous month when prev button clicked", () => {
      const onMonthChange = jest.fn();
      render(
        <BookingCalendar {...defaultProps} onMonthChange={onMonthChange} />
      );
      fireEvent.click(screen.getByLabelText("Tháng trước"));
      expect(onMonthChange).toHaveBeenCalledWith(2026, 5);
    });

    it("calls onMonthChange with next month when next button clicked", () => {
      const onMonthChange = jest.fn();
      render(
        <BookingCalendar {...defaultProps} onMonthChange={onMonthChange} />
      );
      fireEvent.click(screen.getByLabelText("Tháng sau"));
      expect(onMonthChange).toHaveBeenCalledWith(2026, 7);
    });

    it("wraps December to January of next year on next click", () => {
      const onMonthChange = jest.fn();
      render(
        <BookingCalendar
          {...defaultProps}
          currentMonth={{ year: 2026, month: 12 }}
          onMonthChange={onMonthChange}
        />
      );
      fireEvent.click(screen.getByLabelText("Tháng sau"));
      expect(onMonthChange).toHaveBeenCalledWith(2027, 1);
    });

    it("calls onDateSelect when available date is clicked", () => {
      const onDateSelect = jest.fn();
      render(
        <BookingCalendar {...defaultProps} onDateSelect={onDateSelect} />
      );
      const day10 = screen.getByLabelText(/10 tháng 6/);
      fireEvent.click(day10);
      expect(onDateSelect).toHaveBeenCalledWith("2026-06-10");
    });

    it("does not call onDateSelect when clicking unavailable date button (disabled)", () => {
      const onDateSelect = jest.fn();
      render(
        <BookingCalendar {...defaultProps} onDateSelect={onDateSelect} />
      );
      const day11 = screen.getByLabelText(/11 tháng 6/);
      expect(day11).toBeDisabled();
      fireEvent.click(day11);
      expect(onDateSelect).not.toHaveBeenCalled();
    });

    it("shows selected date with aria-pressed=true", () => {
      render(
        <BookingCalendar {...defaultProps} selectedDate="2026-06-10" />
      );
      const day10 = screen.getByLabelText(/10 tháng 6/);
      expect(day10).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("Mobile (Week View)", () => {
    beforeEach(() => {
      setViewport(375);
    });

    it("renders only 7 day cells in week view", () => {
      render(
        <BookingCalendar {...defaultProps} selectedDate="2026-06-10" />
      );
      // Week view should render exactly 7 buttons (days)
      const dayButtons = screen.getAllByRole("button").filter(
        (btn) => btn.getAttribute("aria-label")?.includes("tháng")
      );
      expect(dayButtons).toHaveLength(7);
    });

    it("shows week navigation labels (Tuần trước / Tuần sau)", () => {
      render(
        <BookingCalendar {...defaultProps} selectedDate="2026-06-10" />
      );
      expect(screen.getByLabelText("Tuần trước")).toBeInTheDocument();
      expect(screen.getByLabelText("Tuần sau")).toBeInTheDocument();
    });

    it("navigates to next week and calls onDateSelect", () => {
      const onDateSelect = jest.fn();
      render(
        <BookingCalendar
          {...defaultProps}
          selectedDate="2026-06-10"
          onDateSelect={onDateSelect}
        />
      );
      fireEvent.click(screen.getByLabelText("Tuần sau"));
      expect(onDateSelect).toHaveBeenCalled();
    });
  });

  describe("Legend & Indicators", () => {
    it("renders legend items", () => {
      render(<BookingCalendar {...defaultProps} />);
      expect(screen.getByText("Còn slot")).toBeInTheDocument();
      expect(screen.getByText("Đang chọn")).toBeInTheDocument();
      expect(screen.getByText("Hôm nay")).toBeInTheDocument();
    });
  });
});
