/**
 * OrderDetailModal Tests — Story 4.4c
 * Tests for the customer order detail modal component.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OrderDetailModal from "@/components/client/orders/OrderDetailModal";
import type { CustomerOrderDetail } from "@/types/order";

// Mock order-actions entirely to avoid auth import issues
const mockDownloadInvoice = jest.fn();
jest.mock("@/app/actions/order-actions", () => ({
  downloadOrderInvoice: (...args: unknown[]) => mockDownloadInvoice(...args),
  getCustomerOrders: jest.fn(),
  getCustomerOrderDetail: jest.fn(),
  createOrder: jest.fn(),
  getOrder: jest.fn(),
  fetchOrders: jest.fn(),
  updateOrderStatus: jest.fn(),
  fetchOrderDetail: jest.fn(),
}));

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, "open", { value: mockWindowOpen, writable: true });

const MOCK_ORDER: CustomerOrderDetail = {
  id: "order-001",
  order_number: "ORD-20260318-ABC123",
  total_amount: 1200000,
  status: "delivered",
  payment_status: "paid",
  order_type: "buy",
  created_at: "2026-03-18T10:00:00Z",
  payment_method: "cod",
  shipping_note: null,
  items: [
    {
      garment_id: "g-001",
      garment_name: "Áo Dài Lụa Xanh",
      image_url: null,
      transaction_type: "buy",
      size: "M",
      quantity: 1,
      unit_price: 1200000,
      total_price: 1200000,
      start_date: null,
      end_date: null,
      rental_days: null,
      rental_status: null,
      deposit_amount: null,
    },
  ],
  delivery_info: {
    recipient_name: "Nguyễn Thị Linh",
    phone: "0901234567",
    address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    notes: "Giao giờ hành chính",
  },
  timeline: [
    {
      status: "pending",
      timestamp: "2026-03-18T10:00:00Z",
      description: "Đơn hàng được tạo",
    },
    {
      status: "delivered",
      timestamp: "2026-03-20T14:00:00Z",
      description: "Giao hàng thành công",
    },
  ],
};

const MOCK_RENTAL_ORDER: CustomerOrderDetail = {
  ...MOCK_ORDER,
  id: "order-002",
  order_type: "rental",
  items: [
    {
      garment_id: "g-002",
      garment_name: "Áo Dài Thuê",
      image_url: null,
      transaction_type: "rent",
      size: "S",
      quantity: 1,
      unit_price: 300000,
      total_price: 600000,
      start_date: "2026-03-18",
      end_date: "2026-03-20",
      rental_days: 2,
      rental_status: "returned",
      deposit_amount: 90000,
    },
  ],
};

describe("OrderDetailModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when isOpen=false", () => {
    render(
      <OrderDetailModal order={MOCK_ORDER} isOpen={false} onClose={() => {}} />
    );
    expect(screen.queryByText("Chi tiết đơn hàng")).not.toBeInTheDocument();
  });

  it("renders order detail correctly when open", () => {
    render(
      <OrderDetailModal order={MOCK_ORDER} isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByText("Chi tiết đơn hàng")).toBeInTheDocument();
    expect(screen.getByText("ORD-20260318-ABC123")).toBeInTheDocument();
  });

  it("displays items table with garment info", () => {
    render(
      <OrderDetailModal order={MOCK_ORDER} isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByText("Áo Dài Lụa Xanh")).toBeInTheDocument();
    // Size M
    expect(screen.getByText("Size: M")).toBeInTheDocument();
  });

  it("shows delivery info section", () => {
    render(
      <OrderDetailModal order={MOCK_ORDER} isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByText("Nguyễn Thị Linh")).toBeInTheDocument();
    expect(screen.getByText("0901234567")).toBeInTheDocument();
    expect(screen.getByText(/123 Nguyễn Huệ/)).toBeInTheDocument();
  });

  it("shows status timeline", () => {
    render(
      <OrderDetailModal order={MOCK_ORDER} isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByText("Đơn hàng được tạo")).toBeInTheDocument();
    expect(screen.getByText("Giao hàng thành công")).toBeInTheDocument();
  });

  it("shows rental-specific fields for rental orders (AC4)", () => {
    render(
      <OrderDetailModal order={MOCK_RENTAL_ORDER} isOpen={true} onClose={() => {}} />
    );
    // Rental date range
    expect(screen.getByText(/Thuê:/)).toBeInTheDocument();
    // Rental status: returned
    expect(screen.getByText("Đã trả")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const mockClose = jest.fn();
    render(
      <OrderDetailModal order={MOCK_ORDER} isOpen={true} onClose={mockClose} />
    );
    const closeButton = screen.getByLabelText("Đóng");
    fireEvent.click(closeButton);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("download invoice button triggers action and opens new window", async () => {
    const mockHtml = "<html><body>HÓA ĐƠN</body></html>";
    mockDownloadInvoice.mockResolvedValue({ success: true, htmlContent: mockHtml });
    mockWindowOpen.mockReturnValue({ document: { write: jest.fn(), close: jest.fn() } });

    render(
      <OrderDetailModal order={MOCK_ORDER} isOpen={true} onClose={() => {}} />
    );

    const downloadBtn = screen.getByText("Tải Hoá Đơn");
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(mockDownloadInvoice).toHaveBeenCalledWith("order-001");
      expect(mockWindowOpen).toHaveBeenCalledWith("", "_blank");
    });
  });
});
