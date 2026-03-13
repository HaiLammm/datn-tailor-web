/**
 * OrderSummary Component Tests - Story 3.2: Render Cart Checkout Details
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { OrderSummary } from "@/components/client/checkout/OrderSummary";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("OrderSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("display", () => {
    it("renders title", () => {
      render(
        <OrderSummary
          itemCount={2}
          subtotal={3500000}
          hasUnavailableItems={false}
          isVerifying={false}
        />
      );
      expect(screen.getByText("Tóm Tắt Đơn Hàng")).toBeInTheDocument();
    });

    it("renders item count", () => {
      render(
        <OrderSummary
          itemCount={3}
          subtotal={3500000}
          hasUnavailableItems={false}
          isVerifying={false}
        />
      );
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders subtotal and total with formatted price", () => {
      render(
        <OrderSummary
          itemCount={2}
          subtotal={3500000}
          hasUnavailableItems={false}
          isVerifying={false}
        />
      );
      const totalEl = screen.getByTestId("order-total");
      expect(totalEl).toHaveTextContent(/3\.500\.000/);
    });
  });

  describe("proceed button", () => {
    it("is enabled when all items available and not verifying", () => {
      render(
        <OrderSummary
          itemCount={2}
          subtotal={3500000}
          hasUnavailableItems={false}
          isVerifying={false}
        />
      );
      const btn = screen.getByTestId("proceed-button");
      expect(btn).not.toBeDisabled();
      expect(btn).toHaveTextContent("Tiếp Tục Thanh Toán");
    });

    it("is disabled when unavailable items exist", () => {
      render(
        <OrderSummary
          itemCount={2}
          subtotal={3500000}
          hasUnavailableItems={true}
          isVerifying={false}
        />
      );
      const btn = screen.getByTestId("proceed-button");
      expect(btn).toBeDisabled();
    });

    it("is disabled when verifying", () => {
      render(
        <OrderSummary
          itemCount={2}
          subtotal={3500000}
          hasUnavailableItems={false}
          isVerifying={true}
        />
      );
      const btn = screen.getByTestId("proceed-button");
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent("Đang xác minh...");
    });

    it("is disabled when cart is empty", () => {
      render(
        <OrderSummary
          itemCount={0}
          subtotal={0}
          hasUnavailableItems={false}
          isVerifying={false}
        />
      );
      const btn = screen.getByTestId("proceed-button");
      expect(btn).toBeDisabled();
    });

    it("navigates to /checkout/shipping on click", () => {
      render(
        <OrderSummary
          itemCount={2}
          subtotal={3500000}
          hasUnavailableItems={false}
          isVerifying={false}
        />
      );
      fireEvent.click(screen.getByTestId("proceed-button"));
      expect(mockPush).toHaveBeenCalledWith("/checkout/shipping");
    });
  });

  describe("unavailable items warning", () => {
    it("shows warning when hasUnavailableItems is true", () => {
      render(
        <OrderSummary
          itemCount={2}
          subtotal={3500000}
          hasUnavailableItems={true}
          isVerifying={false}
        />
      );
      expect(screen.getByTestId("unavailable-items-warning")).toBeInTheDocument();
      expect(screen.getByText(/Vui lòng xóa các sản phẩm không khả dụng/)).toBeInTheDocument();
    });

    it("does not show warning when all items available", () => {
      render(
        <OrderSummary
          itemCount={2}
          subtotal={3500000}
          hasUnavailableItems={false}
          isVerifying={false}
        />
      );
      expect(screen.queryByTestId("unavailable-items-warning")).not.toBeInTheDocument();
    });
  });
});
