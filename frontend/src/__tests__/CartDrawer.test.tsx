/**
 * CartDrawer Component Tests - Story 3.1: Cart State Management
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { CartDrawer } from "@/components/client/cart/CartDrawer";
import { useCartStore } from "@/store/cartStore";
import type { CartItem } from "@/types/cart";

// Mock Next.js Link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}));

// Mock Next.js Image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const makeBuyItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: "item-buy-1",
  garment_id: "g-1",
  garment_name: "Áo Dài Truyền Thống",
  image_url: "/img/ao-dai.jpg",
  transaction_type: "buy",
  size: "M",
  unit_price: 2000000,
  total_price: 2000000,
  ...overrides,
});

describe("CartDrawer", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  describe("khi isOpen=false", () => {
    it("drawer vẫn render nhưng ẩn (translate-x-full)", () => {
      render(<CartDrawer isOpen={false} onClose={() => {}} />);
      const drawer = screen.getByTestId("cart-drawer");
      expect(drawer).toBeInTheDocument();
      expect(drawer).toHaveClass("translate-x-full");
    });

    it("không hiển thị backdrop", () => {
      render(<CartDrawer isOpen={false} onClose={() => {}} />);
      expect(screen.queryByTestId("cart-backdrop")).not.toBeInTheDocument();
    });
  });

  describe("khi isOpen=true, giỏ trống", () => {
    it("hiển thị empty state", () => {
      render(<CartDrawer isOpen={true} onClose={() => {}} />);
      expect(screen.getByTestId("cart-empty-state")).toBeInTheDocument();
      expect(screen.getByText("Giỏ hàng trống")).toBeInTheDocument();
    });

    it("không hiển thị nút Thanh Toán khi giỏ trống", () => {
      render(<CartDrawer isOpen={true} onClose={() => {}} />);
      expect(screen.queryByText(/Tiến hành Thanh Toán/)).not.toBeInTheDocument();
    });
  });

  describe("khi có items trong giỏ", () => {
    beforeEach(() => {
      useCartStore.setState({ items: [makeBuyItem()] });
    });

    it("hiển thị tên sản phẩm", () => {
      render(<CartDrawer isOpen={true} onClose={() => {}} />);
      expect(screen.getByText("Áo Dài Truyền Thống")).toBeInTheDocument();
    });

    it("hiển thị nút Thanh Toán", () => {
      render(<CartDrawer isOpen={true} onClose={() => {}} />);
      expect(screen.getByText(/Tiến hành Thanh Toán/)).toBeInTheDocument();
    });

    it("xóa item khi bấm nút xóa", () => {
      render(<CartDrawer isOpen={true} onClose={() => {}} />);
      const removeBtn = screen.getByLabelText("Xóa Áo Dài Truyền Thống khỏi giỏ hàng");
      fireEvent.click(removeBtn);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("hiển thị đúng tổng tiền", () => {
      render(<CartDrawer isOpen={true} onClose={() => {}} />);
      const priceElements = screen.getAllByText(/2\.000\.000/);
      expect(priceElements.length).toBeGreaterThan(0);
    });
  });

  describe("callback onClose", () => {
    it("gọi onClose khi bấm nút đóng", () => {
      const onClose = jest.fn();
      render(<CartDrawer isOpen={true} onClose={onClose} />);
      fireEvent.click(screen.getByLabelText("Đóng giỏ hàng"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("gọi onClose khi bấm backdrop", () => {
      const onClose = jest.fn();
      render(<CartDrawer isOpen={true} onClose={onClose} />);
      fireEvent.click(screen.getByTestId("cart-backdrop"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
