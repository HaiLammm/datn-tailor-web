/**
 * Order History Page Tests — Story 4.4c
 * Tests for OrdersClient (client wrapper of the orders page).
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock order actions (avoid auth import issues with requireActual)
const mockGetCustomerOrderDetail = jest.fn();
jest.mock("@/app/actions/order-actions", () => ({
  getCustomerOrderDetail: (...args: unknown[]) => mockGetCustomerOrderDetail(...args),
  getCustomerOrders: jest.fn(),
  downloadOrderInvoice: jest.fn(),
  createOrder: jest.fn(),
  getOrder: jest.fn(),
  fetchOrders: jest.fn(),
  updateOrderStatus: jest.fn(),
  fetchOrderDetail: jest.fn(),
}));

// Mock OrderDetailModal
jest.mock("@/components/client/orders/OrderDetailModal", () =>
  function MockModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
      <div data-testid="order-detail-modal">
        <button onClick={onClose}>Đóng Modal</button>
      </div>
    );
  }
);

import OrdersClient from "@/app/(customer)/profile/orders/OrdersClient";
import type { CustomerOrderListResponse } from "@/types/order";

const MOCK_LIST: CustomerOrderListResponse = {
  data: [
    {
      id: "order-001",
      order_number: "ORD-20260318-ABC123",
      total_amount: 1200000,
      status: "delivered",
      payment_status: "paid",
      order_type: "buy",
      created_at: "2026-03-18T10:00:00Z",
    },
    {
      id: "order-002",
      order_number: "ORD-20260318-DEF456",
      total_amount: 600000,
      status: "confirmed",
      payment_status: "pending",
      order_type: "rental",
      created_at: "2026-03-18T12:00:00Z",
    },
  ],
  meta: { total: 2, page: 1, limit: 10, total_pages: 1 },
};

const MOCK_ORDER_DETAIL = {
  id: "order-001",
  order_number: "ORD-20260318-ABC123",
  total_amount: 1200000,
  status: "delivered",
  payment_status: "paid",
  order_type: "buy",
  created_at: "2026-03-18T10:00:00Z",
  payment_method: "cod",
  shipping_note: null,
  items: [],
  delivery_info: {
    recipient_name: "Linh",
    phone: "0901234567",
    address: "123 Test",
    notes: null,
  },
  timeline: [],
};

describe("OrdersClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when no orders", () => {
    render(
      <OrdersClient
        initialData={{ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } }}
        initialPage={1}
      />
    );
    expect(screen.getByText("Chưa có đơn hàng nào")).toBeInTheDocument();
    expect(screen.getByText("Khám phá Showroom")).toBeInTheDocument();
  });

  it("renders order cards/rows when orders exist", () => {
    render(<OrdersClient initialData={MOCK_LIST} initialPage={1} />);
    // Check that order numbers are displayed (desktop table view)
    expect(screen.getAllByText("ORD-20260318-ABC123").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ORD-20260318-DEF456").length).toBeGreaterThan(0);
  });

  it("displays correct status badges for orders", () => {
    render(<OrdersClient initialData={MOCK_LIST} initialPage={1} />);
    expect(screen.getAllByText("Đã giao").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Đã xác nhận").length).toBeGreaterThan(0);
  });

  it("displays error state when error prop is provided", () => {
    render(
      <OrdersClient
        initialData={null}
        initialPage={1}
        error="Không thể tải đơn hàng"
      />
    );
    expect(screen.getByText("Không thể tải đơn hàng")).toBeInTheDocument();
    expect(screen.getByText("Thử lại")).toBeInTheDocument();
  });

  it("shows pagination when total_pages > 1", () => {
    const multiPageData: CustomerOrderListResponse = {
      data: MOCK_LIST.data,
      meta: { total: 15, page: 1, limit: 10, total_pages: 2 },
    };
    render(<OrdersClient initialData={multiPageData} initialPage={1} />);
    expect(screen.getByText("Sau ›")).toBeInTheDocument();
    expect(screen.getByText("‹ Trước")).toBeInTheDocument();
  });

  it("shows filter dropdowns", () => {
    render(<OrdersClient initialData={MOCK_LIST} initialPage={1} />);
    expect(screen.getByLabelText("Lọc theo trạng thái")).toBeInTheDocument();
    expect(screen.getByLabelText("Lọc theo loại đơn")).toBeInTheDocument();
  });

  it("opens order detail modal when order row is clicked", async () => {
    mockGetCustomerOrderDetail.mockResolvedValue({
      success: true,
      data: MOCK_ORDER_DETAIL,
    });

    render(<OrdersClient initialData={MOCK_LIST} initialPage={1} />);

    // Click first "Xem chi tiết" link (desktop table)
    const viewDetailLinks = screen.getAllByText("Xem chi tiết");
    fireEvent.click(viewDetailLinks[0]);

    await waitFor(() => {
      expect(mockGetCustomerOrderDetail).toHaveBeenCalledWith("order-001");
      expect(screen.getByTestId("order-detail-modal")).toBeInTheDocument();
    });
  });

  it("applies responsive classes (mobile card + desktop table)", () => {
    const { container } = render(
      <OrdersClient initialData={MOCK_LIST} initialPage={1} />
    );
    // Mobile section has md:hidden
    const mobileSection = container.querySelector(".md\\:hidden");
    expect(mobileSection).toBeInTheDocument();
    // Desktop section has hidden md:block
    const desktopSection = container.querySelector(".hidden.md\\:block");
    expect(desktopSection).toBeInTheDocument();
  });
});
