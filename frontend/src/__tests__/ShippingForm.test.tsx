/**
 * ShippingFormClient Tests - Story 3.3: Checkout Information & Payment Gateway
 * Tests form rendering, validation, and order submission.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Next.js navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

// Mock order actions
const mockCreateOrder = jest.fn();
jest.mock("@/app/actions/order-actions", () => ({
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
}));

// Mock cart store
const mockClearCart = jest.fn();
const mockCartItems = [
  {
    id: "item-1",
    garment_id: "g-1",
    garment_name: "Áo Dài Đỏ",
    image_url: "/img/ao-dai.jpg",
    transaction_type: "buy",
    size: "M",
    unit_price: 1200000,
    total_price: 1200000,
  },
];

jest.mock("@/store/cartStore", () => ({
  useCartStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      items: mockCartItems,
      clearCart: mockClearCart,
      cartTotal: () => 1200000,
    };
    return selector(state);
  },
}));

// Mock format utils
jest.mock("@/utils/format", () => ({
  formatPrice: (v: number) => `${v.toLocaleString()} ₫`,
}));

import { ShippingFormClient } from "@/components/client/checkout/ShippingFormClient";

describe("ShippingFormClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders form with all required fields", () => {
    render(<ShippingFormClient />);

    expect(screen.getByLabelText(/họ và tên/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/số điện thoại/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tỉnh\/thành phố/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quận\/huyện/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phường\/xã/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/địa chỉ chi tiết/i)).toBeInTheDocument();
  });

  it("shows shipping form data-testid", () => {
    render(<ShippingFormClient />);
    expect(screen.getByTestId("shipping-form")).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    render(<ShippingFormClient />);

    const submitBtn = screen.getByTestId("submit-button");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId("fullName-error")).toBeInTheDocument();
      expect(screen.getByTestId("phone-error")).toBeInTheDocument();
    });
  });

  it("shows phone validation error for invalid phone", async () => {
    render(<ShippingFormClient />);

    const phoneInput = screen.getByLabelText(/số điện thoại/i);
    fireEvent.change(phoneInput, { target: { value: "12345" } });
    fireEvent.blur(phoneInput);

    await waitFor(() => {
      expect(screen.getByTestId("phone-error")).toBeInTheDocument();
    });
  });

  it("does not show error for valid VN phone", async () => {
    render(<ShippingFormClient />);

    const phoneInput = screen.getByLabelText(/số điện thoại/i);
    fireEvent.change(phoneInput, { target: { value: "0912345678" } });
    fireEvent.blur(phoneInput);

    await waitFor(() => {
      expect(screen.queryByTestId("phone-error")).toBeNull();
    });
  });

  it("shows back button navigating to /checkout", () => {
    render(<ShippingFormClient />);

    const backBtn = screen.getByTestId("back-button");
    fireEvent.click(backBtn);

    expect(mockPush).toHaveBeenCalledWith("/checkout");
  });

  it("calls createOrder with correct data on valid submit", async () => {
    mockCreateOrder.mockResolvedValueOnce({
      success: true,
      data: { order_id: "order-1", status: "pending", payment_url: null },
    });

    render(<ShippingFormClient />);

    fireEvent.change(screen.getByLabelText(/họ và tên/i), {
      target: { value: "Nguyễn Văn A" },
    });
    fireEvent.change(screen.getByLabelText(/số điện thoại/i), {
      target: { value: "0912345678" },
    });
    fireEvent.change(screen.getByLabelText(/tỉnh\/thành phố/i), {
      target: { value: "TP. Hồ Chí Minh" },
    });
    fireEvent.change(screen.getByLabelText(/quận\/huyện/i), {
      target: { value: "Quận 1" },
    });
    fireEvent.change(screen.getByLabelText(/phường\/xã/i), {
      target: { value: "Phường Bến Nghé" },
    });
    fireEvent.change(screen.getByLabelText(/địa chỉ chi tiết/i), {
      target: { value: "123 Nguyễn Huệ" },
    });

    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_name: "Nguyễn Văn A",
          customer_phone: "0912345678",
          payment_method: "cod",
          shipping_address: expect.objectContaining({
            province: "TP. Hồ Chí Minh",
            address_detail: "123 Nguyễn Huệ",
          }),
        })
      );
    });
  });

  it("clears cart and redirects to confirmation after COD success", async () => {
    mockCreateOrder.mockResolvedValueOnce({
      success: true,
      data: { order_id: "order-1", status: "pending", payment_url: null },
    });

    render(<ShippingFormClient />);

    fireEvent.change(screen.getByLabelText(/họ và tên/i), {
      target: { value: "Nguyễn Văn A" },
    });
    fireEvent.change(screen.getByLabelText(/số điện thoại/i), {
      target: { value: "0912345678" },
    });
    fireEvent.change(screen.getByLabelText(/tỉnh\/thành phố/i), {
      target: { value: "TP. Hồ Chí Minh" },
    });
    fireEvent.change(screen.getByLabelText(/quận\/huyện/i), {
      target: { value: "Quận 1" },
    });
    fireEvent.change(screen.getByLabelText(/phường\/xã/i), {
      target: { value: "Phường Bến Nghé" },
    });
    fireEvent.change(screen.getByLabelText(/địa chỉ chi tiết/i), {
      target: { value: "123 Nguyễn Huệ" },
    });

    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith(
        "/checkout/confirmation?orderId=order-1"
      );
    });
  });

  it("shows submit error when createOrder fails", async () => {
    mockCreateOrder.mockResolvedValueOnce({
      success: false,
      error: "Sản phẩm không khả dụng",
    });

    render(<ShippingFormClient />);

    fireEvent.change(screen.getByLabelText(/họ và tên/i), {
      target: { value: "Nguyễn Văn A" },
    });
    fireEvent.change(screen.getByLabelText(/số điện thoại/i), {
      target: { value: "0912345678" },
    });
    fireEvent.change(screen.getByLabelText(/tỉnh\/thành phố/i), {
      target: { value: "TP. Hồ Chí Minh" },
    });
    fireEvent.change(screen.getByLabelText(/quận\/huyện/i), {
      target: { value: "Quận 1" },
    });
    fireEvent.change(screen.getByLabelText(/phường\/xã/i), {
      target: { value: "Phường Bến Nghé" },
    });
    fireEvent.change(screen.getByLabelText(/địa chỉ chi tiết/i), {
      target: { value: "123 Nguyễn Huệ" },
    });

    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("submit-error")).toBeInTheDocument();
      expect(screen.getByText(/sản phẩm không khả dụng/i)).toBeInTheDocument();
    });
  });

  it("does NOT clear cart if createOrder fails", async () => {
    mockCreateOrder.mockResolvedValueOnce({
      success: false,
      error: "Lỗi server",
    });

    render(<ShippingFormClient />);

    fireEvent.change(screen.getByLabelText(/họ và tên/i), {
      target: { value: "Nguyễn Văn A" },
    });
    fireEvent.change(screen.getByLabelText(/số điện thoại/i), {
      target: { value: "0912345678" },
    });
    fireEvent.change(screen.getByLabelText(/tỉnh\/thành phố/i), {
      target: { value: "TP. Hồ Chí Minh" },
    });
    fireEvent.change(screen.getByLabelText(/quận\/huyện/i), {
      target: { value: "Quận 1" },
    });
    fireEvent.change(screen.getByLabelText(/phường\/xã/i), {
      target: { value: "Phường Bến Nghé" },
    });
    fireEvent.change(screen.getByLabelText(/địa chỉ chi tiết/i), {
      target: { value: "123 Nguyễn Huệ" },
    });

    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(mockClearCart).not.toHaveBeenCalled();
    });
  });

  it("displays order total from cartStore", () => {
    render(<ShippingFormClient />);
    expect(screen.getByTestId("order-total")).toBeInTheDocument();
  });
});
