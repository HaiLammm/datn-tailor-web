/**
 * SlotSelector Tests - Story 3.4: Morning/afternoon slot selection.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("framer-motion", () => ({
  motion: {
    button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import SlotSelector from "@/components/client/booking/SlotSelector";
import type { SlotAvailability } from "@/types/booking";

const fullAvailability: SlotAvailability = {
  date: "2026-06-10",
  morning_available: true,
  morning_remaining: 3,
  afternoon_available: true,
  afternoon_remaining: 2,
};

const morningFullAvailability: SlotAvailability = {
  date: "2026-06-10",
  morning_available: false,
  morning_remaining: 0,
  afternoon_available: true,
  afternoon_remaining: 1,
};

describe("SlotSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders both morning and afternoon slots", () => {
    render(
      <SlotSelector
        availability={fullAvailability}
        selectedSlot={null}
        onSlotSelect={jest.fn()}
      />
    );
    expect(screen.getByText("Buổi Sáng")).toBeInTheDocument();
    expect(screen.getByText("Buổi Chiều")).toBeInTheDocument();
  });

  it("displays time range for each slot", () => {
    render(
      <SlotSelector
        availability={fullAvailability}
        selectedSlot={null}
        onSlotSelect={jest.fn()}
      />
    );
    expect(screen.getByText("9:00 - 12:00")).toBeInTheDocument();
    expect(screen.getByText("13:00 - 17:00")).toBeInTheDocument();
  });

  it("shows remaining count for available slots", () => {
    render(
      <SlotSelector
        availability={fullAvailability}
        selectedSlot={null}
        onSlotSelect={jest.fn()}
      />
    );
    expect(screen.getByText("Còn 3 chỗ")).toBeInTheDocument();
    expect(screen.getByText("Còn 2 chỗ")).toBeInTheDocument();
  });

  it("shows 'Đã đầy' for unavailable morning slot", () => {
    render(
      <SlotSelector
        availability={morningFullAvailability}
        selectedSlot={null}
        onSlotSelect={jest.fn()}
      />
    );
    expect(screen.getByText("Đã đầy")).toBeInTheDocument();
  });

  it("calls onSlotSelect with 'morning' when morning slot clicked", () => {
    const onSlotSelect = jest.fn();
    render(
      <SlotSelector
        availability={fullAvailability}
        selectedSlot={null}
        onSlotSelect={onSlotSelect}
      />
    );
    fireEvent.click(screen.getByLabelText(/Buổi Sáng/));
    expect(onSlotSelect).toHaveBeenCalledWith("morning");
  });

  it("calls onSlotSelect with 'afternoon' when afternoon slot clicked", () => {
    const onSlotSelect = jest.fn();
    render(
      <SlotSelector
        availability={fullAvailability}
        selectedSlot={null}
        onSlotSelect={onSlotSelect}
      />
    );
    fireEvent.click(screen.getByLabelText(/Buổi Chiều/));
    expect(onSlotSelect).toHaveBeenCalledWith("afternoon");
  });

  it("does not call onSlotSelect when unavailable morning slot clicked", () => {
    const onSlotSelect = jest.fn();
    render(
      <SlotSelector
        availability={morningFullAvailability}
        selectedSlot={null}
        onSlotSelect={onSlotSelect}
      />
    );
    fireEvent.click(screen.getByLabelText(/Buổi Sáng.*Đã đầy/));
    expect(onSlotSelect).not.toHaveBeenCalled();
  });

  it("shows selected state (aria-pressed=true) for currently selected slot", () => {
    render(
      <SlotSelector
        availability={fullAvailability}
        selectedSlot="morning"
        onSlotSelect={jest.fn()}
      />
    );
    expect(screen.getByLabelText(/Buổi Sáng/)).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByLabelText(/Buổi Chiều/)).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});
