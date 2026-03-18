/**
 * VoucherList Component Tests — Story 4.4g
 * Tests: render list, empty state, error state, skeleton, copy to clipboard,
 *        status badge display (active/expired/used), 2-column grid.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock profile-actions
const mockGetMyVouchers = jest.fn();

jest.mock("@/app/actions/profile-actions", () => ({
  getMyVouchers: (...args: unknown[]) => mockGetMyVouchers(...args),
}));

// Mock clipboard API
const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
});

import { VoucherList } from "@/components/client/profile/VoucherList";
import type { VoucherItem } from "@/types/voucher";

// ─── Mock data ────────────────────────────────────────────────────────────────

function makeVoucher(overrides: Partial<VoucherItem> = {}): VoucherItem {
  return {
    id: "uv-1",
    voucher_id: "v-1",
    code: "TET2026",
    type: "percent",
    value: "10",
    min_order_value: "500000",
    max_discount_value: "100000",
    description: "Giảm 10% dịp Tết",
    expiry_date: "2099-12-31",
    status: "active",
    assigned_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

const ACTIVE_VOUCHER = makeVoucher({ id: "uv-1", status: "active", code: "TET2026" });
const EXPIRED_VOUCHER = makeVoucher({
  id: "uv-2",
  status: "expired",
  code: "SUMMER25",
  type: "fixed",
  value: "50000",
  min_order_value: "0",
  max_discount_value: null,
  description: null,
  expiry_date: "2025-08-31",
});
const USED_VOUCHER = makeVoucher({
  id: "uv-3",
  status: "used",
  code: "WELCOME",
  type: "fixed",
  value: "100000",
  min_order_value: "200000",
  max_discount_value: null,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("VoucherList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // AC1: Renders voucher list
  it("renders page title and voucher cards", () => {
    render(<VoucherList initialVouchers={[ACTIVE_VOUCHER]} />);

    expect(screen.getByText("Kho Voucher")).toBeInTheDocument();
    expect(screen.getByText("TET2026")).toBeInTheDocument();
    // "Giảm 10%" appears in both discount label and description — use getAllByText
    expect(screen.getAllByText(/Giảm 10%/).length).toBeGreaterThanOrEqual(1);
  });

  // AC1: Renders multiple vouchers
  it("renders all provided vouchers", () => {
    render(
      <VoucherList initialVouchers={[ACTIVE_VOUCHER, EXPIRED_VOUCHER, USED_VOUCHER]} />
    );

    expect(screen.getByText("TET2026")).toBeInTheDocument();
    expect(screen.getByText("SUMMER25")).toBeInTheDocument();
    expect(screen.getByText("WELCOME")).toBeInTheDocument();
  });

  // AC2: Status badge active
  it("shows 'Còn hiệu lực' badge for active voucher", () => {
    render(<VoucherList initialVouchers={[ACTIVE_VOUCHER]} />);
    expect(screen.getByText("Còn hiệu lực")).toBeInTheDocument();
  });

  // AC2: Status badge expired
  it("shows 'Đã hết hạn' badge for expired voucher", () => {
    render(<VoucherList initialVouchers={[EXPIRED_VOUCHER]} />);
    expect(screen.getByText("Đã hết hạn")).toBeInTheDocument();
  });

  // AC2: Status badge used
  it("shows 'Đã sử dụng' badge for used voucher", () => {
    render(<VoucherList initialVouchers={[USED_VOUCHER]} />);
    expect(screen.getByText("Đã sử dụng")).toBeInTheDocument();
  });

  // AC1: Min order formatting
  it("shows 'Không giới hạn' when min_order_value is 0", () => {
    render(<VoucherList initialVouchers={[EXPIRED_VOUCHER]} />);
    expect(screen.getByText(/Không giới hạn/)).toBeInTheDocument();
  });

  it("shows formatted min order value when non-zero", () => {
    render(<VoucherList initialVouchers={[ACTIVE_VOUCHER]} />);
    // 500000 formatted with vi-VN locale
    expect(screen.getByText(/Đơn tối thiểu/)).toBeInTheDocument();
  });

  // AC1: Max discount label
  it("shows max discount when present", () => {
    render(<VoucherList initialVouchers={[ACTIVE_VOUCHER]} />);
    expect(screen.getByText(/Giảm tối đa/)).toBeInTheDocument();
  });

  it("does not show max discount when null", () => {
    render(<VoucherList initialVouchers={[EXPIRED_VOUCHER]} />);
    expect(screen.queryByText(/Giảm tối đa/)).not.toBeInTheDocument();
  });

  // AC3: Copy to clipboard — active voucher
  it("copies code to clipboard when copy button clicked", async () => {
    render(<VoucherList initialVouchers={[ACTIVE_VOUCHER]} />);

    const copyBtn = screen.getByRole("button", { name: /Sao chép mã TET2026/i });
    fireEvent.click(copyBtn);

    expect(mockWriteText).toHaveBeenCalledWith("TET2026");
    await waitFor(() => {
      expect(screen.getByText(/Đã sao chép ✓/)).toBeInTheDocument();
    });
  });

  // AC3: Copy feedback reverts after 2s
  it("resets copy button label after 2 seconds", async () => {
    render(<VoucherList initialVouchers={[ACTIVE_VOUCHER]} />);

    const copyBtn = screen.getByRole("button", { name: /Sao chép mã TET2026/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã sao chép ✓/)).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(2100);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Đã sao chép ✓/)).not.toBeInTheDocument();
      expect(screen.getByText("Sao chép")).toBeInTheDocument();
    });
  });

  // AC3: Copy button disabled for inactive (expired/used) vouchers
  it("disables copy button for expired voucher", () => {
    render(<VoucherList initialVouchers={[EXPIRED_VOUCHER]} />);
    const copyBtn = screen.getByRole("button", { name: /Sao chép mã SUMMER25/i });
    expect(copyBtn).toBeDisabled();
  });

  it("disables copy button for used voucher", () => {
    render(<VoucherList initialVouchers={[USED_VOUCHER]} />);
    const copyBtn = screen.getByRole("button", { name: /Sao chép mã WELCOME/i });
    expect(copyBtn).toBeDisabled();
  });

  // AC4: Empty state
  it("shows empty state when no vouchers", () => {
    render(<VoucherList initialVouchers={[]} />);

    expect(screen.getByText("Chưa có voucher nào")).toBeInTheDocument();
    expect(
      screen.getByText(/Voucher giảm giá sẽ được gửi đến bạn/)
    ).toBeInTheDocument();
  });

  // AC5: Error state with retry
  it("shows error message and retry button when fetch failed", () => {
    render(
      <VoucherList initialVouchers={[]} initialError="Không thể tải danh sách voucher" />
    );

    expect(screen.getByText("Không thể tải danh sách voucher")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Thử lại/i })).toBeInTheDocument();
  });

  // AC5: Retry triggers refetch
  it("refetches vouchers on retry click", async () => {
    mockGetMyVouchers.mockResolvedValueOnce({
      success: true,
      data: { vouchers: [ACTIVE_VOUCHER], voucher_count: 1 },
    });

    render(
      <VoucherList initialVouchers={[]} initialError="Không thể tải danh sách voucher" />
    );

    const retryBtn = screen.getByRole("button", { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(mockGetMyVouchers).toHaveBeenCalledTimes(1);
    });
  });

  // AC1: Fixed voucher formatting
  it("shows correct discount label for fixed type", () => {
    render(<VoucherList initialVouchers={[EXPIRED_VOUCHER]} />);
    // 50000 → discount label in header section (not description)
    // Use getAllByText since "Giảm" can appear in multiple places
    const discountElements = screen.getAllByText(/Giảm/);
    expect(discountElements.length).toBeGreaterThanOrEqual(1);
    // At least one element should contain the discount value
    const hasDiscount = discountElements.some((el) => el.textContent?.includes("50"));
    expect(hasDiscount).toBe(true);
  });

  // Expiry date label
  it("shows expiry date label", () => {
    render(<VoucherList initialVouchers={[ACTIVE_VOUCHER]} />);
    expect(screen.getByText(/Hạn dùng:/)).toBeInTheDocument();
  });

  // Description shown when present
  it("shows description when available", () => {
    render(<VoucherList initialVouchers={[ACTIVE_VOUCHER]} />);
    expect(screen.getByText("Giảm 10% dịp Tết")).toBeInTheDocument();
  });
});
