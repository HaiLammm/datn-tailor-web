/**
 * Frontend Tests - Story 4.2: Owner Order Board
 * Tests StatusBadge color mapping and OrderTable rendering.
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { OrderStatusBadge, PaymentStatusBadge } from "@/components/client/orders/StatusBadge";
import OrderTable from "@/components/client/orders/OrderTable";
import type { OrderListItem, OrderStatus } from "@/types/order";

// -----------------------------------------------------------------------
// StatusBadge tests (Task 7.4)
// -----------------------------------------------------------------------

describe("OrderStatusBadge", () => {
  const cases: { status: OrderStatus; label: string; colorClass: string }[] = [
    { status: "pending", label: "Chờ xác nhận", colorClass: "bg-amber-100" },
    { status: "confirmed", label: "Đã xác nhận", colorClass: "bg-blue-100" },
    { status: "in_progress", label: "Đang may", colorClass: "bg-indigo-100" },
    { status: "checked", label: "Đã kiểm tra", colorClass: "bg-violet-100" },
    { status: "shipped", label: "Đã gửi", colorClass: "bg-cyan-100" },
    { status: "delivered", label: "Đã giao", colorClass: "bg-green-100" },
    { status: "cancelled", label: "Đã hủy", colorClass: "bg-red-100" },
  ];

  cases.forEach(({ status, label, colorClass }) => {
    it(`renders correct label and color for ${status}`, () => {
      render(<OrderStatusBadge status={status} />);
      const badge = screen.getByText(label);
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain(colorClass);
    });
  });
});

describe("PaymentStatusBadge", () => {
  it("renders paid badge with green color", () => {
    render(<PaymentStatusBadge status="paid" />);
    const badge = screen.getByText("Đã TT");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-green-100");
  });

  it("renders failed badge with red color", () => {
    render(<PaymentStatusBadge status="failed" />);
    const badge = screen.getByText("TT lỗi");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-red-100");
  });
});

// -----------------------------------------------------------------------
// OrderTable tests (Task 7.3)
// -----------------------------------------------------------------------

const makeOrder = (overrides: Partial<OrderListItem> = {}): OrderListItem => ({
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  status: "pending",
  payment_status: "pending",
  total_amount: 500000,
  payment_method: "cod",
  customer_name: "Nguyễn Văn A",
  customer_phone: "0901234567",
  transaction_types: ["buy"],
  created_at: "2026-03-17T08:00:00.000Z",
  ...overrides,
});

describe("OrderTable", () => {
  const defaultProps = {
    orders: [makeOrder()],
    sortBy: "created_at",
    sortOrder: "desc" as const,
    onSortChange: jest.fn(),
    onStatusUpdate: jest.fn().mockResolvedValue(undefined),
    onRowClick: jest.fn(),
  };

  it("renders customer name and phone", () => {
    render(<OrderTable {...defaultProps} />);
    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
    expect(screen.getByText("0901234567")).toBeInTheDocument();
  });

  it("renders status badge for each order row", () => {
    render(<OrderTable {...defaultProps} />);
    expect(screen.getByText("Chờ xác nhận")).toBeInTheDocument();
  });

  it("shows 'Next Status' button for pending order", () => {
    render(<OrderTable {...defaultProps} />);
    expect(screen.getByText("Xác nhận")).toBeInTheDocument();
  });

  it("shows 'Cancel' button for non-terminal orders", () => {
    render(<OrderTable {...defaultProps} />);
    expect(screen.getByText("Hủy")).toBeInTheDocument();
  });

  it("does NOT show 'Next Status' for delivered order", () => {
    const props = {
      ...defaultProps,
      orders: [makeOrder({ status: "delivered" })],
    };
    render(<OrderTable {...props} />);
    // No next status button for terminal state
    expect(screen.queryByRole("button", { name: /Giao thành công/i })).toBeNull();
  });

  it("does NOT show 'Cancel' for cancelled order", () => {
    const props = {
      ...defaultProps,
      orders: [makeOrder({ status: "cancelled" })],
    };
    render(<OrderTable {...props} />);
    expect(screen.queryByText("Hủy")).toBeNull();
  });

  it("calls onRowClick when row is clicked", () => {
    const onRowClick = jest.fn();
    const props = { ...defaultProps, onRowClick };
    render(<OrderTable {...props} />);
    // Click on customer name cell (inside the row)
    fireEvent.click(screen.getByText("Nguyễn Văn A"));
    expect(onRowClick).toHaveBeenCalledWith(defaultProps.orders[0]);
  });

  it("calls onSortChange when column header is clicked", () => {
    const onSortChange = jest.fn();
    const props = { ...defaultProps, onSortChange };
    render(<OrderTable {...props} />);
    fireEvent.click(screen.getByText(/Tổng tiền/));
    expect(onSortChange).toHaveBeenCalledWith("total_amount");
  });
});
