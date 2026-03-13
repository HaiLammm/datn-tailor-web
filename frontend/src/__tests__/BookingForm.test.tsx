/**
 * BookingForm Tests - Story 3.4: Customer info form for appointment booking.
 * Tests rendering, validation, submit flow, and error preservation.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import BookingForm from "@/components/client/booking/BookingForm";

const defaultProps = {
  selectedDate: "2026-06-15",
  selectedSlot: "morning" as const,
  onSubmit: jest.fn(),
  isSubmitting: false,
  submitError: null,
};

describe("BookingForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<BookingForm {...defaultProps} />);
    expect(screen.getByLabelText(/Họ và Tên/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Số điện thoại/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Yêu cầu đặc biệt/)).toBeInTheDocument();
  });

  it("shows appointment summary with selected date and slot", () => {
    render(<BookingForm {...defaultProps} />);
    expect(screen.getByText(/15\/06\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Buổi Sáng/)).toBeInTheDocument();
  });

  it("renders submit button with correct label", () => {
    render(<BookingForm {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Xác Nhận Đặt Lịch" })
    ).toBeInTheDocument();
  });

  it("shows loading state when isSubmitting is true", () => {
    render(<BookingForm {...defaultProps} isSubmitting={true} />);
    expect(screen.getByText("Đang xử lý...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Đang xử lý/ })
    ).toBeDisabled();
  });

  it("displays submit error when provided", () => {
    render(
      <BookingForm
        {...defaultProps}
        submitError="Khung giờ vừa được đặt. Vui lòng chọn slot khác."
      />
    );
    expect(screen.getByText(/vừa được đặt/)).toBeInTheDocument();
  });

  it("validates required name field on blur", async () => {
    render(<BookingForm {...defaultProps} />);
    const nameInput = screen.getByLabelText(/Họ và Tên/);
    fireEvent.blur(nameInput);
    await waitFor(() => {
      expect(
        screen.getByText("Họ tên phải có ít nhất 2 ký tự")
      ).toBeInTheDocument();
    });
  });

  it("validates Vietnamese phone number format on blur", async () => {
    render(<BookingForm {...defaultProps} />);
    const phoneInput = screen.getByLabelText(/Số điện thoại/);
    fireEvent.change(phoneInput, { target: { value: "123456" } });
    fireEvent.blur(phoneInput);
    await waitFor(() => {
      expect(screen.getByText(/Số điện thoại không hợp lệ/)).toBeInTheDocument();
    });
  });

  it("accepts valid Vietnamese phone number", async () => {
    render(<BookingForm {...defaultProps} />);
    const phoneInput = screen.getByLabelText(/Số điện thoại/);
    fireEvent.change(phoneInput, { target: { value: "0912345678" } });
    fireEvent.blur(phoneInput);
    await waitFor(() => {
      expect(
        screen.queryByText(/Số điện thoại không hợp lệ/)
      ).not.toBeInTheDocument();
    });
  });

  it("validates email format on blur", async () => {
    render(<BookingForm {...defaultProps} />);
    const emailInput = screen.getByLabelText(/Email/);
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });
    fireEvent.blur(emailInput);
    await waitFor(() => {
      expect(screen.getByText("Email không hợp lệ")).toBeInTheDocument();
    });
  });

  it("shows character count for special requests", () => {
    render(<BookingForm {...defaultProps} />);
    expect(screen.getByText("0/500")).toBeInTheDocument();
  });

  it("does not submit form when validation fails", async () => {
    const onSubmit = jest.fn();
    render(<BookingForm {...defaultProps} onSubmit={onSubmit} />);
    const submitBtn = screen.getByRole("button", { name: "Xác Nhận Đặt Lịch" });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it("calls onSubmit with correct data when form is valid", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<BookingForm {...defaultProps} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/Họ và Tên/), "Nguyễn Thị Lan");
    await userEvent.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await userEvent.type(screen.getByLabelText(/Email/), "lan@test.com");

    fireEvent.click(screen.getByRole("button", { name: "Xác Nhận Đặt Lịch" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_name: "Nguyễn Thị Lan",
          customer_phone: "0912345678",
          customer_email: "lan@test.com",
          appointment_date: "2026-06-15",
          slot: "morning",
        })
      );
    });
  });

  it("preserves form data when submitError is shown (no reset)", () => {
    render(
      <BookingForm
        {...defaultProps}
        submitError="Lỗi từ server"
      />
    );
    const nameInput = screen.getByLabelText(/Họ và Tên/);
    // Input should still be accessible and not reset
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).not.toBeDisabled();
  });

  it("shows afternoon slot label correctly", () => {
    render(
      <BookingForm {...defaultProps} selectedSlot="afternoon" />
    );
    expect(screen.getByText(/Buổi Chiều/)).toBeInTheDocument();
  });
});
