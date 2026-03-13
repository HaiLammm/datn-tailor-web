/**
 * SizeSelectModal Component Tests - Story 3.1: Cart State Management (Review Fix M4)
 * Tests size selection, validation, and cart submission.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { SizeSelectModal } from "@/components/client/showroom/SizeSelectModal";
import { useCartStore } from "@/store/cartStore";
import type { Garment } from "@/types/garment";

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: { randomUUID: () => "test-uuid-size-1234" },
  writable: true,
});

const mockGarment: Garment = {
  id: "g-1",
  tenant_id: "t-1",
  name: "Áo Dài Truyền Thống",
  description: null,
  category: "ao_dai_truyen_thong",
  color: null,
  occasion: null,
  material: null,
  size_options: ["S", "M", "L", "XL"],
  rental_price: "500000",
  sale_price: "2000000",
  image_url: "/img/ao-dai.jpg",
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

describe("SizeSelectModal", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  describe("rendering", () => {
    it("không render khi isOpen=false", () => {
      render(<SizeSelectModal garment={mockGarment} isOpen={false} onClose={() => {}} onSuccess={() => {}} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("render modal khi isOpen=true", () => {
      render(<SizeSelectModal garment={mockGarment} isOpen={true} onClose={() => {}} onSuccess={() => {}} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Chọn kích cỡ")).toBeInTheDocument();
    });

    it("hiển thị tên sản phẩm", () => {
      render(<SizeSelectModal garment={mockGarment} isOpen={true} onClose={() => {}} onSuccess={() => {}} />);
      expect(screen.getByText("Áo Dài Truyền Thống")).toBeInTheDocument();
    });

    it("hiển thị tất cả size options", () => {
      render(<SizeSelectModal garment={mockGarment} isOpen={true} onClose={() => {}} onSuccess={() => {}} />);
      expect(screen.getByText("S")).toBeInTheDocument();
      expect(screen.getByText("M")).toBeInTheDocument();
      expect(screen.getByText("L")).toBeInTheDocument();
      expect(screen.getByText("XL")).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("hiển thị lỗi khi submit mà không chọn size", () => {
      render(<SizeSelectModal garment={mockGarment} isOpen={true} onClose={() => {}} onSuccess={() => {}} />);
      fireEvent.click(screen.getByText("Thêm vào Giỏ"));
      expect(screen.getByText("Vui lòng chọn kích cỡ")).toBeInTheDocument();
    });

    it("không submit khi chưa chọn size", () => {
      render(<SizeSelectModal garment={mockGarment} isOpen={true} onClose={() => {}} onSuccess={() => {}} />);
      fireEvent.click(screen.getByText("Thêm vào Giỏ"));
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe("size selection", () => {
    it("cho phép chọn size qua radio button", () => {
      render(<SizeSelectModal garment={mockGarment} isOpen={true} onClose={() => {}} onSuccess={() => {}} />);
      const radioM = screen.getByRole("radio", { name: "M" });
      fireEvent.click(radioM);
      fireEvent.click(screen.getByText("Thêm vào Giỏ"));
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].size).toBe("M");
    });
  });

  describe("successful submission", () => {
    it("thêm item vào cart với đúng transaction_type và size", () => {
      const onSuccess = jest.fn();
      const onClose = jest.fn();
      render(<SizeSelectModal garment={mockGarment} isOpen={true} onClose={onClose} onSuccess={onSuccess} />);
      fireEvent.click(screen.getByText("L"));
      fireEvent.click(screen.getByText("Thêm vào Giỏ"));

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].transaction_type).toBe("buy");
      expect(items[0].size).toBe("L");
      expect(items[0].total_price).toBe(2000000);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("onClose callback", () => {
    it("gọi onClose khi bấm Huỷ", () => {
      const onClose = jest.fn();
      render(<SizeSelectModal garment={mockGarment} isOpen={true} onClose={onClose} onSuccess={() => {}} />);
      fireEvent.click(screen.getByText("Huỷ"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
