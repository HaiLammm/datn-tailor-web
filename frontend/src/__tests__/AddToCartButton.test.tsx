/**
 * AddToCartButton Component Tests - Story 3.1: Cart State Management
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { AddToCartButton } from "@/components/client/showroom/AddToCartButton";
import { useCartStore } from "@/store/cartStore";
import type { Garment } from "@/types/garment";

// Mock child modals
jest.mock("@/components/client/showroom/RentalDateModal", () => ({
  RentalDateModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="rental-date-modal">
        <button onClick={onClose}>Đóng Modal Thuê</button>
      </div>
    ) : null,
}));

jest.mock("@/components/client/showroom/SizeSelectModal", () => ({
  SizeSelectModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="size-select-modal">
        <button onClick={onClose}>Đóng Modal Mua</button>
      </div>
    ) : null,
}));

const mockGarment: Garment = {
  id: "g-1",
  tenant_id: "t-1",
  name: "Áo Dài Test",
  description: null,
  category: "ao_dai_truyen_thong",
  color: null,
  occasion: null,
  material: null,
  size_options: ["S", "M", "L"],
  rental_price: "500000",
  sale_price: "2000000",
  image_url: "/img/test.jpg",
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
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("AddToCartButton", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  describe("mode=rent", () => {
    it("renders button với text 'Thêm Thuê'", () => {
      render(<AddToCartButton garment={mockGarment} mode="rent" />);
      expect(screen.getByRole("button", { name: /Thêm Thuê/i })).toBeInTheDocument();
    });

    it("mở RentalDateModal khi click", () => {
      render(<AddToCartButton garment={mockGarment} mode="rent" />);
      fireEvent.click(screen.getByRole("button", { name: /Thêm Thuê/i }));
      expect(screen.getByTestId("rental-date-modal")).toBeInTheDocument();
    });

    it("đóng RentalDateModal khi modal close", () => {
      render(<AddToCartButton garment={mockGarment} mode="rent" />);
      fireEvent.click(screen.getByRole("button", { name: /Thêm Thuê/i }));
      fireEvent.click(screen.getByText("Đóng Modal Thuê"));
      expect(screen.queryByTestId("rental-date-modal")).not.toBeInTheDocument();
    });
  });

  describe("mode=buy", () => {
    it("renders button với text 'Thêm Mua'", () => {
      render(<AddToCartButton garment={mockGarment} mode="buy" />);
      expect(screen.getByRole("button", { name: /Thêm Mua/i })).toBeInTheDocument();
    });

    it("mở SizeSelectModal khi click", () => {
      render(<AddToCartButton garment={mockGarment} mode="buy" />);
      fireEvent.click(screen.getByRole("button", { name: /Thêm Mua/i }));
      expect(screen.getByTestId("size-select-modal")).toBeInTheDocument();
    });
  });

  describe("disabled states", () => {
    it("disabled khi garment không available", () => {
      const unavailable = { ...mockGarment, status: "rented" };
      render(<AddToCartButton garment={unavailable} mode="rent" />);
      const btn = screen.getByRole("button");
      expect(btn).toBeDisabled();
    });

    it("disabled mode=buy khi không có sale_price", () => {
      const noSale = { ...mockGarment, sale_price: null };
      render(<AddToCartButton garment={noSale} mode="buy" />);
      const btn = screen.getByRole("button");
      expect(btn).toBeDisabled();
    });
  });
});
