/**
 * PaymentMethodSelector Tests - Story 3.3: Checkout Information & Payment Gateway
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { PaymentMethodSelector } from "@/components/client/checkout/PaymentMethodSelector";

describe("PaymentMethodSelector", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all 3 payment options", () => {
    render(<PaymentMethodSelector value="cod" onChange={mockOnChange} />);

    expect(screen.getByTestId("payment-option-cod")).toBeInTheDocument();
    expect(screen.getByTestId("payment-option-vnpay")).toBeInTheDocument();
    expect(screen.getByTestId("payment-option-momo")).toBeInTheDocument();
  });

  it("COD is selected by default when value=cod", () => {
    render(<PaymentMethodSelector value="cod" onChange={mockOnChange} />);

    const codInput = screen.getByRole("radio", { name: /thanh toán khi nhận hàng/i });
    expect(codInput).toBeChecked();
  });

  it("VNPay is selected when value=vnpay", () => {
    render(<PaymentMethodSelector value="vnpay" onChange={mockOnChange} />);

    const vnpayInput = screen.getByRole("radio", { name: /vnpay/i });
    expect(vnpayInput).toBeChecked();
  });

  it("Momo is selected when value=momo", () => {
    render(<PaymentMethodSelector value="momo" onChange={mockOnChange} />);

    const momoInput = screen.getByRole("radio", { name: /momo/i });
    expect(momoInput).toBeChecked();
  });

  it("calls onChange with cod when COD option clicked", () => {
    render(<PaymentMethodSelector value="vnpay" onChange={mockOnChange} />);

    const codLabel = screen.getByTestId("payment-option-cod");
    fireEvent.click(codLabel);

    expect(mockOnChange).toHaveBeenCalledWith("cod");
  });

  it("calls onChange with vnpay when VNPay option clicked", () => {
    render(<PaymentMethodSelector value="cod" onChange={mockOnChange} />);

    const vnpayLabel = screen.getByTestId("payment-option-vnpay");
    fireEvent.click(vnpayLabel);

    expect(mockOnChange).toHaveBeenCalledWith("vnpay");
  });

  it("calls onChange with momo when Momo option clicked", () => {
    render(<PaymentMethodSelector value="cod" onChange={mockOnChange} />);

    const momoLabel = screen.getByTestId("payment-option-momo");
    fireEvent.click(momoLabel);

    expect(mockOnChange).toHaveBeenCalledWith("momo");
  });

  it("displays trust badge with security message", () => {
    render(<PaymentMethodSelector value="cod" onChange={mockOnChange} />);

    expect(screen.getByText(/thanh toán an toàn/i)).toBeInTheDocument();
  });

  it("uses radiogroup role for accessibility", () => {
    render(<PaymentMethodSelector value="cod" onChange={mockOnChange} />);

    expect(
      screen.getByRole("radiogroup", { name: /phương thức thanh toán/i })
    ).toBeInTheDocument();
  });
});
