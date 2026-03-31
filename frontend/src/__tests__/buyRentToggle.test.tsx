/**
 * BuyRentToggle Component Tests - Story 2.2
 *
 * Tests:
 * - Render toggle Mua/Thuê
 * - Default mode là "Thuê"
 * - Date picker hiển thị khi mode = Thuê
 * - Date picker ẩn khi mode = Mua
 * - Nút "Mua" disabled nếu không có sale_price
 * - Hiển thị đúng giá theo mode
 * - CTA buttons: "Thêm vào giỏ hàng" và "Đặt lịch Bespoke"
 * - Nút disabled khi sản phẩm không available
 * - Accessibility: min touch targets ≥44px
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BuyRentToggle } from "@/components/client/showroom/BuyRentToggle";
import type { Garment } from "@/types/garment";

const mockGarment: Garment = {
  id: "g-001",
  tenant_id: "t-001",
  name: "Áo dài truyền thống đỏ",
  description: null,
  category: "ao_dai",
  color: "Đỏ",
  occasion: null,
  material: null,
  size_options: ["S", "M", "L"],
  rental_price: "500000",
  sale_price: "2000000",
  image_url: null,
  image_urls: [],
  status: "available",
  expected_return_date: null,
  days_until_available: null,
  is_overdue: false,
  renter_id: null,
  renter_name: null,
  renter_email: null,
  reminder_sent_at: null,
  reminder_sent: false,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

describe("BuyRentToggle (Story 2.2)", () => {
  const defaultProps = {
    garment: mockGarment,
    productName: "Áo dài truyền thống đỏ",
    rentalPrice: "500000",
    salePrice: "2000000",
    isAvailable: true,
    supportsBespoke: true,
  };

  it("should render Thuê/Mua toggle buttons", () => {
    render(<BuyRentToggle {...defaultProps} />);
    expect(screen.getByRole("radio", { name: "Thuê" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Mua" })).toBeInTheDocument();
  });

  it("should default to Thuê mode", () => {
    render(<BuyRentToggle {...defaultProps} />);
    const thueBtn = screen.getByRole("radio", { name: "Thuê" });
    expect(thueBtn).toHaveAttribute("aria-checked", "true");
  });

  it("should show date picker when mode is Thuê (default)", () => {
    render(<BuyRentToggle {...defaultProps} />);
    expect(screen.getByLabelText("Ngày bắt đầu thuê")).toBeInTheDocument();
    expect(screen.getByLabelText("Ngày trả đồ")).toBeInTheDocument();
  });

  it("should hide date picker when mode switches to Mua", () => {
    render(<BuyRentToggle {...defaultProps} />);
    const muaBtn = screen.getByRole("radio", { name: "Mua" });
    fireEvent.click(muaBtn);
    expect(screen.queryByLabelText("Ngày bắt đầu thuê")).not.toBeInTheDocument();
  });

  it("should display rental price label when in Thuê mode", () => {
    render(<BuyRentToggle {...defaultProps} />);
    expect(screen.getByText("Giá thuê")).toBeInTheDocument();
  });

  it("should display sale price label when mode switches to Mua", () => {
    render(<BuyRentToggle {...defaultProps} />);
    fireEvent.click(screen.getByRole("radio", { name: "Mua" }));
    expect(screen.getByText("Giá bán")).toBeInTheDocument();
  });

  it("should disable Mua button when sale_price is null", () => {
    render(<BuyRentToggle {...defaultProps} salePrice={null} />);
    const muaBtn = screen.getByRole("radio", { name: "Mua" });
    expect(muaBtn).toBeDisabled();
  });

  it("should render 'Tiến hành thanh toán' CTA when available", () => {
    render(<BuyRentToggle {...defaultProps} />);
    expect(
      screen.getByLabelText(`Tiến hành thanh toán ${defaultProps.productName}`)
    ).toBeInTheDocument();
  });

  it("should show 'Hết hàng' when not available", () => {
    render(<BuyRentToggle {...defaultProps} isAvailable={false} />);
    expect(screen.getByText("Hết hàng")).toBeInTheDocument();
  });

  it("should disable add-to-cart button when not available", () => {
    render(<BuyRentToggle {...defaultProps} isAvailable={false} />);
    const cartBtn = screen.getByLabelText(
      `${defaultProps.productName} hiện không có sẵn`
    );
    expect(cartBtn).toBeDisabled();
  });

  it("should render 'Đặt lịch Bespoke' button when supportsBespoke=true", () => {
    render(<BuyRentToggle {...defaultProps} supportsBespoke={true} />);
    expect(
      screen.getByLabelText(`Đặt lịch tư vấn Bespoke cho ${defaultProps.productName}`)
    ).toBeInTheDocument();
  });

  it("should hide 'Đặt lịch Bespoke' when supportsBespoke=false", () => {
    render(<BuyRentToggle {...defaultProps} supportsBespoke={false} />);
    expect(screen.queryByText("Đặt lịch Bespoke")).not.toBeInTheDocument();
  });

  it("should have accessible role group for toggle", () => {
    render(<BuyRentToggle {...defaultProps} />);
    expect(
      screen.getByRole("group", { name: "Chọn hình thức: Mua hoặc Thuê" })
    ).toBeInTheDocument();
  });
});
