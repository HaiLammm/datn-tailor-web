/**
 * OrderConfirmationClient Tests - Story 4.1: Payment Webhook State Handling
 * Tests that confirmation page fetches real status from backend, not query params.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

const mockClearCart = jest.fn();
jest.mock("@/store/cartStore", () => ({
  useCartStore: (selector: (s: { clearCart: () => void }) => unknown) =>
    selector({ clearCart: mockClearCart }),
}));

const mockGetOrder = jest.fn();
jest.mock("@/app/actions/order-actions", () => ({
  getOrder: (...args: unknown[]) => mockGetOrder(...args),
}));

jest.mock("@/components/client/checkout/OrderConfirmation", () => ({
  OrderConfirmation: ({ order }: { order: { id: string } }) => (
    <div data-testid="order-confirmation">{order.id}</div>
  ),
}));

import { OrderConfirmationClient } from "@/components/client/checkout/OrderConfirmationClient";
import type { OrderResponse } from "@/types/order";

const MOCK_ORDER_PAID: OrderResponse = {
  id: "order-abc-123",
  status: "confirmed",
  payment_status: "paid",
  total_amount: 1200000,
  payment_method: "vnpay",
  payment_url: null,
  customer_name: "Nguyễn Văn A",
  customer_phone: "0912345678",
  shipping_address: {
    province: "HCM",
    district: "Q1",
    ward: "P1",
    address_detail: "123 ABC",
  },
  items: [],
  created_at: "2026-03-11T00:00:00Z",
};

const MOCK_ORDER_FAILED: OrderResponse = {
  ...MOCK_ORDER_PAID,
  status: "pending",
  payment_status: "failed",
};

const MOCK_ORDER_PENDING: OrderResponse = {
  ...MOCK_ORDER_PAID,
  status: "pending",
  payment_status: "pending",
};

describe("OrderConfirmationClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("redirects to showroom when no orderId", () => {
    render(<OrderConfirmationClient orderId={null} />);
    expect(mockReplace).toHaveBeenCalledWith("/showroom");
  });

  it("fetches order from backend and renders success (AC#8)", async () => {
    mockGetOrder.mockResolvedValue({ success: true, data: MOCK_ORDER_PAID });

    await act(async () => {
      render(<OrderConfirmationClient orderId="order-abc-123" />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("order-confirmation")).toBeInTheDocument();
    });

    // Verifies backend was called, not query params
    expect(mockGetOrder).toHaveBeenCalledWith("order-abc-123");
  });

  it("shows payment failed state from backend payment_status", async () => {
    mockGetOrder.mockResolvedValue({ success: true, data: MOCK_ORDER_FAILED });

    await act(async () => {
      render(<OrderConfirmationClient orderId="order-abc-123" />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("payment-failed-shop-btn")).toBeInTheDocument();
    });
  });

  it("clears cart on successful payment", async () => {
    mockGetOrder.mockResolvedValue({ success: true, data: MOCK_ORDER_PAID });

    await act(async () => {
      render(<OrderConfirmationClient orderId="order-abc-123" />);
    });

    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled();
    });
  });

  it("does NOT clear cart on failed payment", async () => {
    mockGetOrder.mockResolvedValue({ success: true, data: MOCK_ORDER_FAILED });

    await act(async () => {
      render(<OrderConfirmationClient orderId="order-abc-123" />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("payment-failed-shop-btn")).toBeInTheDocument();
    });

    expect(mockClearCart).not.toHaveBeenCalled();
  });

  it("shows error state when fetch fails", async () => {
    mockGetOrder.mockResolvedValue({ success: false, error: "Server error" });

    await act(async () => {
      render(<OrderConfirmationClient orderId="order-abc-123" />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("order-error")).toBeInTheDocument();
    });
  });

  it("shows polling state when payment_status is pending for online payment", async () => {
    mockGetOrder.mockResolvedValue({ success: true, data: MOCK_ORDER_PENDING });

    await act(async () => {
      render(<OrderConfirmationClient orderId="order-abc-123" />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("payment-polling")).toBeInTheDocument();
    });
  });

  it("always uses backend data, not any external status prop", async () => {
    // Backend says failed, component should show failed state
    mockGetOrder.mockResolvedValue({ success: true, data: MOCK_ORDER_FAILED });

    await act(async () => {
      render(
        <OrderConfirmationClient orderId="order-abc-123" />
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("payment-failed-shop-btn")).toBeInTheDocument();
    });
  });

  it("shows timeout message when polling exceeds max attempts (M4)", async () => {
    // Return pending status every time to trigger timeout
    mockGetOrder.mockResolvedValue({ success: true, data: { ...MOCK_ORDER_PENDING, payment_method: "vnpay" } });

    await act(async () => {
      render(<OrderConfirmationClient orderId="order-abc-123" />);
    });

    // Wait for initial fetch and polling to start
    await waitFor(() => {
      expect(screen.getByTestId("payment-polling")).toBeInTheDocument();
    });

    // Advance through all poll attempts — each poll needs timer advance + microtask flush
    for (let i = 0; i < 11; i++) {
      await act(async () => {
        jest.advanceTimersByTime(3000);
        // Allow async getOrder promise to resolve
        await Promise.resolve();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId("payment-timeout")).toBeInTheDocument();
    });
  });
});
