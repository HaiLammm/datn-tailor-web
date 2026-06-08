/**
 * Story 10.7b — RefundDialog (condition selection) component tests.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { OrderListItem } from "@/types/order";

// Mock server actions so importing OrderBoardClient doesn't pull in @/auth
jest.mock("@/app/actions/order-actions", () => ({
  approveOrder: jest.fn(),
  fetchOrderDetail: jest.fn(),
  fetchOrders: jest.fn(),
  refundSecurity: jest.fn(),
  updateOrderStatus: jest.fn(),
  updatePreparationStep: jest.fn(),
}));
jest.mock("@/app/actions/owner-task-actions", () => ({
  fetchStaffData: jest.fn(),
}));

import { RefundDialog } from "@/components/client/orders/OrderBoardClient";

function makeOrder(overrides: Partial<OrderListItem> = {}): OrderListItem {
  return {
    id: "order-abcdef12",
    status: "returned",
    payment_status: "paid",
    subtotal_amount: 500000,
    discount_amount: 0,
    total_amount: 500000,
    payment_method: "cod",
    customer_name: "Nguyễn Văn A",
    customer_phone: "0912345678",
    transaction_types: ["rent"],
    created_at: "2026-06-08T10:00:00Z",
    next_valid_status: "completed",
    service_type: "rent",
    security_type: "cash_deposit",
    security_value: "500000",
    ...overrides,
  };
}

describe("RefundDialog", () => {
  it("renders the three conditions for a cash deposit", () => {
    render(
      <RefundDialog order={makeOrder()} onConfirm={jest.fn()} onCancel={jest.fn()} isLoading={false} />
    );
    expect(screen.getByText("Tốt")).toBeInTheDocument();
    expect(screen.getByText("Hỏng")).toBeInTheDocument();
    expect(screen.getByText("Thất lạc")).toBeInTheDocument();
    // Lost shows the zero-refund preview
    expect(screen.getByText(/Không hoàn cọc/)).toBeInTheDocument();
  });

  it("confirms with the selected condition", () => {
    const onConfirm = jest.fn();
    render(
      <RefundDialog order={makeOrder()} onConfirm={onConfirm} onCancel={jest.fn()} isLoading={false} />
    );
    // Default is Good; pick Lost
    fireEvent.click(screen.getByDisplayValue("Lost"));
    fireEvent.click(screen.getByText("Xác nhận hoàn cọc"));
    expect(onConfirm).toHaveBeenCalledWith("Lost");
  });

  it("uses ID-card copy for a CCCD deposit (no VND refund)", () => {
    render(
      <RefundDialog
        order={makeOrder({ security_type: "cccd", security_value: "079..." })}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        isLoading={false}
      />
    );
    expect(screen.getAllByText(/giấy tờ tùy thân/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Xác nhận trả giấy tờ")).toBeInTheDocument();
    // No "Hoàn ... đ" cash preview for CCCD
    expect(screen.queryByText(/Không hoàn cọc/)).not.toBeInTheDocument();
  });
});
