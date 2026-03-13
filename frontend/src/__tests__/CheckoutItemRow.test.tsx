/**
 * CheckoutItemRow Component Tests - Story 3.2: Render Cart Checkout Details
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { CheckoutItemRow } from "@/components/client/checkout/CheckoutItemRow";
import type { CartItem } from "@/types/cart";
import type { VerifyResult } from "@/app/actions/cart-actions";

// Mock next/image
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

const makeRentItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: "item-rent-1",
  garment_id: "g-2",
  garment_name: "Áo Dài Cưới",
  image_url: "/img/ao-dai-cuoi.jpg",
  transaction_type: "rent",
  start_date: "2026-04-01",
  end_date: "2026-04-03",
  rental_days: 3,
  unit_price: 500000,
  total_price: 1500000,
  ...overrides,
});

const makeAvailableResult = (garment_id: string): VerifyResult => ({
  garment_id,
  is_available: true,
  verified_sale_price: 2000000,
  verified_rental_price: 500000,
  current_status: "available",
});

const makeUnavailableResult = (garment_id: string): VerifyResult => ({
  garment_id,
  is_available: false,
  verified_sale_price: 0,
  verified_rental_price: 0,
  current_status: "rented",
});

describe("CheckoutItemRow", () => {
  describe("basic display", () => {
    it("renders product name", () => {
      render(<CheckoutItemRow item={makeBuyItem()} onRemove={() => {}} />);
      expect(screen.getByText("Áo Dài Truyền Thống")).toBeInTheDocument();
    });

    it("renders buy badge for buy items", () => {
      render(<CheckoutItemRow item={makeBuyItem()} onRemove={() => {}} />);
      expect(screen.getByText("Mua")).toBeInTheDocument();
    });

    it("renders rent badge for rent items", () => {
      render(<CheckoutItemRow item={makeRentItem()} onRemove={() => {}} />);
      expect(screen.getByText("Thuê")).toBeInTheDocument();
    });

    it("renders size detail for buy items", () => {
      render(<CheckoutItemRow item={makeBuyItem()} onRemove={() => {}} />);
      expect(screen.getByText(/Size: M/)).toBeInTheDocument();
    });

    it("renders rental date detail for rent items", () => {
      render(<CheckoutItemRow item={makeRentItem()} onRemove={() => {}} />);
      expect(screen.getByText(/2026-04-01 → 2026-04-03/)).toBeInTheDocument();
      expect(screen.getByText(/3 ngày/)).toBeInTheDocument();
    });

    it("renders thumbnail image", () => {
      render(<CheckoutItemRow item={makeBuyItem()} onRemove={() => {}} />);
      const img = screen.getByAltText("Áo Dài Truyền Thống");
      expect(img).toBeInTheDocument();
    });

    it("renders 'No img' placeholder when no image_url", () => {
      render(
        <CheckoutItemRow
          item={makeBuyItem({ image_url: "" })}
          onRemove={() => {}}
        />
      );
      expect(screen.getByText("No img")).toBeInTheDocument();
    });

    it("renders item total price", () => {
      render(<CheckoutItemRow item={makeBuyItem()} onRemove={() => {}} />);
      const totalEl = screen.getByTestId("item-total");
      expect(totalEl).toHaveTextContent(/2\.000\.000/);
    });
  });

  describe("remove button", () => {
    it("calls onRemove with item id when clicked", () => {
      const onRemove = jest.fn();
      render(<CheckoutItemRow item={makeBuyItem()} onRemove={onRemove} />);
      const removeBtn = screen.getByTestId("remove-item-item-buy-1");
      fireEvent.click(removeBtn);
      expect(onRemove).toHaveBeenCalledWith("item-buy-1");
    });

    it("has accessible label", () => {
      render(<CheckoutItemRow item={makeBuyItem()} onRemove={() => {}} />);
      expect(screen.getByLabelText("Xóa Áo Dài Truyền Thống")).toBeInTheDocument();
    });
  });

  describe("unavailable state", () => {
    it("shows unavailable warning when item is not available", () => {
      render(
        <CheckoutItemRow
          item={makeBuyItem()}
          verifyResult={makeUnavailableResult("g-1")}
          onRemove={() => {}}
        />
      );
      expect(screen.getByTestId("unavailable-warning")).toBeInTheDocument();
      expect(screen.getByText("Sản phẩm này hiện không khả dụng")).toBeInTheDocument();
    });

    it("applies opacity when unavailable", () => {
      render(
        <CheckoutItemRow
          item={makeBuyItem()}
          verifyResult={makeUnavailableResult("g-1")}
          onRemove={() => {}}
        />
      );
      const row = screen.getByTestId("checkout-item-item-buy-1");
      expect(row).toHaveClass("opacity-60");
    });

    it("does not show warning when item is available", () => {
      render(
        <CheckoutItemRow
          item={makeBuyItem()}
          verifyResult={makeAvailableResult("g-1")}
          onRemove={() => {}}
        />
      );
      expect(screen.queryByTestId("unavailable-warning")).not.toBeInTheDocument();
    });
  });

  describe("price change display", () => {
    it("shows old price (strikethrough) and new price when price changed", () => {
      const item = makeBuyItem({ unit_price: 2000000 });
      const verifyResult: VerifyResult = {
        garment_id: "g-1",
        is_available: true,
        verified_sale_price: 2500000,
        verified_rental_price: 0,
        current_status: "available",
      };

      render(
        <CheckoutItemRow
          item={item}
          verifyResult={verifyResult}
          onRemove={() => {}}
        />
      );

      expect(screen.getByTestId("old-price")).toBeInTheDocument();
      expect(screen.getByTestId("new-price")).toBeInTheDocument();
    });

    it("does not show price change indicators when price is the same", () => {
      render(
        <CheckoutItemRow
          item={makeBuyItem()}
          verifyResult={makeAvailableResult("g-1")}
          onRemove={() => {}}
        />
      );

      expect(screen.queryByTestId("old-price")).not.toBeInTheDocument();
      expect(screen.queryByTestId("new-price")).not.toBeInTheDocument();
    });
  });
});
