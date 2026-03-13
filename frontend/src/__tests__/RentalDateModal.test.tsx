/**
 * RentalDateModal Component Tests - Story 3.1: Cart State Management
 * Tests date validation and price calculation.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { RentalDateModal } from "@/components/client/showroom/RentalDateModal";
import { useCartStore } from "@/store/cartStore";
import type { Garment } from "@/types/garment";

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: { randomUUID: () => "test-uuid-1234" },
  writable: true,
});

const mockGarment: Garment = {
  id: "g-1",
  tenant_id: "t-1",
  name: "Áo Dài Cưới",
  description: null,
  category: "ao_dai_cuoi",
  color: null,
  occasion: null,
  material: null,
  size_options: ["S", "M", "L"],
  rental_price: "500000",
  sale_price: null,
  image_url: "/img/ao-dai-cuoi.jpg",
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

const TODAY = new Date().toISOString().split("T")[0];
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split("T")[0];
const DAY_AFTER = new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];

describe("RentalDateModal", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  describe("rendering", () => {
    it("không render khi isOpen=false", () => {
      render(<RentalDateModal garment={mockGarment} isOpen={false} onClose={() => {}} onSuccess={() => {}} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("render modal khi isOpen=true", () => {
      render(<RentalDateModal garment={mockGarment} isOpen={true} onClose={() => {}} onSuccess={() => {}} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Chọn ngày thuê")).toBeInTheDocument();
    });

    it("hiển thị tên sản phẩm", () => {
      render(<RentalDateModal garment={mockGarment} isOpen={true} onClose={() => {}} onSuccess={() => {}} />);
      expect(screen.getByText("Áo Dài Cưới")).toBeInTheDocument();
    });
  });

  describe("date validation", () => {
    it("hiển thị lỗi khi không chọn ngày và submit", () => {
      render(<RentalDateModal garment={mockGarment} isOpen={true} onClose={() => {}} onSuccess={() => {}} />);
      fireEvent.click(screen.getByText("Thêm vào Giỏ"));
      expect(screen.getByText("Vui lòng chọn ngày bắt đầu")).toBeInTheDocument();
      expect(screen.getByText("Vui lòng chọn ngày kết thúc")).toBeInTheDocument();
    });

    it("hiển thị lỗi khi end_date <= start_date", () => {
      render(<RentalDateModal garment={mockGarment} isOpen={true} onClose={() => {}} onSuccess={() => {}} />);
      fireEvent.change(screen.getByLabelText("Ngày bắt đầu"), { target: { value: TOMORROW } });
      fireEvent.change(screen.getByLabelText("Ngày kết thúc"), { target: { value: TOMORROW } });
      fireEvent.click(screen.getByText("Thêm vào Giỏ"));
      expect(screen.getByText("Ngày kết thúc phải sau ngày bắt đầu")).toBeInTheDocument();
    });

    it("không submit khi có validation error", () => {
      render(<RentalDateModal garment={mockGarment} isOpen={true} onClose={() => {}} onSuccess={() => {}} />);
      fireEvent.click(screen.getByText("Thêm vào Giỏ"));
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe("price calculation", () => {
    it("hiển thị preview giá khi chọn đủ ngày", () => {
      render(<RentalDateModal garment={mockGarment} isOpen={true} onClose={() => {}} onSuccess={() => {}} />);
      fireEvent.change(screen.getByLabelText("Ngày bắt đầu"), { target: { value: TOMORROW } });
      fireEvent.change(screen.getByLabelText("Ngày kết thúc"), { target: { value: DAY_AFTER } });
      // 1 ngày × 500000 = 500000 (có thể nhiều phần tử)
      const priceElements = screen.getAllByText(/500\.000/);
      expect(priceElements.length).toBeGreaterThan(0);
    });
  });

  describe("successful submission", () => {
    it("thêm item vào cart khi submit hợp lệ", () => {
      const onSuccess = jest.fn();
      const onClose = jest.fn();
      render(<RentalDateModal garment={mockGarment} isOpen={true} onClose={onClose} onSuccess={onSuccess} />);
      fireEvent.change(screen.getByLabelText("Ngày bắt đầu"), { target: { value: TOMORROW } });
      fireEvent.change(screen.getByLabelText("Ngày kết thúc"), { target: { value: DAY_AFTER } });
      fireEvent.click(screen.getByText("Thêm vào Giỏ"));
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].transaction_type).toBe("rent");
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("onClose callback", () => {
    it("gọi onClose khi bấm Huỷ", () => {
      const onClose = jest.fn();
      render(<RentalDateModal garment={mockGarment} isOpen={true} onClose={onClose} onSuccess={() => {}} />);
      fireEvent.click(screen.getByText("Huỷ"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
