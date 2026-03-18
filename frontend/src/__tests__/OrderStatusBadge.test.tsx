/**
 * OrderStatusBadge Tests — Story 4.4c
 * Tests for customer-facing OrderStatusBadge (includes rental statuses).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  OrderStatusBadge,
  OrderTypeBadge,
} from "@/components/client/orders/OrderStatusBadge";

describe("OrderStatusBadge", () => {
  it("renders pending status with correct label", () => {
    render(<OrderStatusBadge status="pending" />);
    expect(screen.getByText("Chờ xác nhận")).toBeInTheDocument();
  });

  it("renders confirmed status", () => {
    render(<OrderStatusBadge status="confirmed" />);
    expect(screen.getByText("Đã xác nhận")).toBeInTheDocument();
  });

  it("renders in_production status", () => {
    render(<OrderStatusBadge status="in_production" />);
    expect(screen.getByText("Đang may")).toBeInTheDocument();
  });

  it("renders shipped status", () => {
    render(<OrderStatusBadge status="shipped" />);
    expect(screen.getByText("Đã gửi")).toBeInTheDocument();
  });

  it("renders delivered status", () => {
    render(<OrderStatusBadge status="delivered" />);
    expect(screen.getByText("Đã giao")).toBeInTheDocument();
  });

  it("renders cancelled status", () => {
    render(<OrderStatusBadge status="cancelled" />);
    expect(screen.getByText("Đã hủy")).toBeInTheDocument();
  });

  it("renders returned status (rental-specific)", () => {
    render(<OrderStatusBadge status="returned" />);
    expect(screen.getByText("Đã trả")).toBeInTheDocument();
  });

  it("renders overdue status (rental-specific)", () => {
    render(<OrderStatusBadge status="overdue" />);
    expect(screen.getByText("Quá hạn")).toBeInTheDocument();
  });

  it("falls back gracefully for unknown status", () => {
    render(<OrderStatusBadge status="unknown_status_xyz" />);
    expect(screen.getByText("unknown_status_xyz")).toBeInTheDocument();
  });
});

describe("OrderTypeBadge", () => {
  it("renders buy type", () => {
    render(<OrderTypeBadge orderType="buy" />);
    expect(screen.getByText("Mua")).toBeInTheDocument();
  });

  it("renders rental type", () => {
    render(<OrderTypeBadge orderType="rental" />);
    expect(screen.getByText("Thuê")).toBeInTheDocument();
  });

  it("renders mixed type", () => {
    render(<OrderTypeBadge orderType="mixed" />);
    expect(screen.getByText("Hỗn hợp")).toBeInTheDocument();
  });
});
