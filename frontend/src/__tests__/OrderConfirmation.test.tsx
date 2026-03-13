/**
 * OrderConfirmation Tests - Story 3.3: Checkout Information & Payment Gateway
 * Tests rendering of order details and CTA buttons.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/utils/format", () => ({
  formatPrice: (v: number) => `${v.toLocaleString()} ₫`,
}));

import { OrderConfirmation } from "@/components/client/checkout/OrderConfirmation";
import type { OrderResponse } from "@/types/order";

const MOCK_ORDER: OrderResponse = {
  id: "order-abc-123",
  status: "pending",
  payment_status: "pending",
  total_amount: 1200000,
  payment_method: "cod",
  payment_url: null,
  customer_name: "Nguyễn Văn A",
  customer_phone: "0912345678",
  shipping_address: {
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    address_detail: "123 Nguyễn Huệ",
  },
  shipping_note: null,
  items: [
    {
      garment_id: "g-1",
      garment_name: "Áo Dài Đỏ",
      image_url: "/img/ao-dai.jpg",
      transaction_type: "buy",
      size: "M",
      rental_days: null,
      unit_price: 1200000,
      total_price: 1200000,
    },
  ],
  created_at: "2026-03-11T00:00:00Z",
};

describe("OrderConfirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders confirmation header", () => {
    render(<OrderConfirmation order={MOCK_ORDER} />);
    expect(screen.getByTestId("confirmation-header")).toBeInTheDocument();
    expect(
      screen.getByText(/đơn hàng đã được tạo thành công/i)
    ).toBeInTheDocument();
  });

  it("displays order ID", () => {
    render(<OrderConfirmation order={MOCK_ORDER} />);
    expect(screen.getByTestId("order-id")).toHaveTextContent("order-abc-123");
  });

  it("displays order status", () => {
    render(<OrderConfirmation order={MOCK_ORDER} />);
    expect(screen.getByTestId("order-status")).toHaveTextContent(
      "Chờ Xác Nhận"
    );
  });

  it("displays customer name", () => {
    render(<OrderConfirmation order={MOCK_ORDER} />);
    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
  });

  it("displays payment method as COD label", () => {
    render(<OrderConfirmation order={MOCK_ORDER} />);
    expect(
      screen.getByText(/thanh toán khi nhận hàng/i)
    ).toBeInTheDocument();
  });

  it("renders order items", () => {
    render(<OrderConfirmation order={MOCK_ORDER} />);
    const items = screen.getByTestId("order-items");
    expect(items).toBeInTheDocument();
    expect(screen.getByText("Áo Dài Đỏ")).toBeInTheDocument();
  });

  it("displays total amount", () => {
    render(<OrderConfirmation order={MOCK_ORDER} />);
    expect(screen.getByTestId("order-total")).toBeInTheDocument();
  });

  it("displays shipping address", () => {
    render(<OrderConfirmation order={MOCK_ORDER} />);
    expect(screen.getByText(/123 Nguyễn Huệ/)).toBeInTheDocument();
    expect(screen.getByText(/TP. Hồ Chí Minh/)).toBeInTheDocument();
  });

  it("renders CTA buttons", () => {
    render(<OrderConfirmation order={MOCK_ORDER} />);
    expect(screen.getByTestId("cta-buttons")).toBeInTheDocument();
    expect(screen.getByTestId("continue-shopping-btn")).toBeInTheDocument();
    expect(screen.getByTestId("view-orders-btn")).toBeInTheDocument();
  });

  it("navigates to showroom on 'Tiếp tục mua sắm'", () => {
    render(<OrderConfirmation order={MOCK_ORDER} />);
    fireEvent.click(screen.getByTestId("continue-shopping-btn"));
    expect(mockPush).toHaveBeenCalledWith("/showroom");
  });

  it("navigates to orders on 'Xem đơn hàng'", () => {
    render(<OrderConfirmation order={MOCK_ORDER} />);
    fireEvent.click(screen.getByTestId("view-orders-btn"));
    expect(mockPush).toHaveBeenCalledWith("/profile/orders");
  });

  it("shows VNPay label for vnpay payment method", () => {
    const vnpayOrder = { ...MOCK_ORDER, payment_method: "vnpay" as const };
    render(<OrderConfirmation order={vnpayOrder} />);
    expect(screen.getByText("VNPay")).toBeInTheDocument();
  });

  it("shows rent details for rental items", () => {
    const rentOrder = {
      ...MOCK_ORDER,
      items: [
        {
          ...MOCK_ORDER.items[0],
          transaction_type: "rent" as const,
          rental_days: 3,
          size: undefined,
        },
      ],
    };
    render(<OrderConfirmation order={rentOrder} />);
    expect(screen.getByText(/thuê/i)).toBeInTheDocument();
    expect(screen.getByText(/3 ngày/i)).toBeInTheDocument();
  });
});
