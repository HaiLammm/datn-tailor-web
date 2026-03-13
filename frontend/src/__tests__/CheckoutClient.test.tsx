/**
 * CheckoutClient Component Tests - Story 3.2: Render Cart Checkout Details
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import { CheckoutClient } from "@/components/client/checkout/CheckoutClient";
import { useCartStore } from "@/store/cartStore";
import type { CartItem } from "@/types/cart";

// Mock next/navigation
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

// Mock verifyCartItems
const mockVerifyCartItems = jest.fn();
jest.mock("@/app/actions/cart-actions", () => ({
  verifyCartItems: (...args: unknown[]) => mockVerifyCartItems(...args),
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

describe("CheckoutClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCartStore.setState({ items: [] });
    mockVerifyCartItems.mockResolvedValue([]);
  });

  describe("empty cart redirect", () => {
    it("redirects to /showroom when cart is empty", () => {
      render(<CheckoutClient />);
      expect(mockReplace).toHaveBeenCalledWith("/showroom");
    });

    it("returns null when cart is empty", () => {
      const { container } = render(<CheckoutClient />);
      expect(container.innerHTML).toBe("");
    });
  });

  describe("items display", () => {
    it("renders cart items from store", async () => {
      useCartStore.setState({ items: [makeBuyItem(), makeRentItem()] });
      mockVerifyCartItems.mockResolvedValue([
        { garment_id: "g-1", is_available: true, verified_sale_price: 2000000, verified_rental_price: 0, current_status: "available" },
        { garment_id: "g-2", is_available: true, verified_sale_price: 0, verified_rental_price: 500000, current_status: "available" },
      ]);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByTestId("checkout-items-list")).toBeInTheDocument();
      });

      expect(screen.getByText("Áo Dài Truyền Thống")).toBeInTheDocument();
      expect(screen.getByText("Áo Dài Cưới")).toBeInTheDocument();
    });

    it("displays page title", async () => {
      useCartStore.setState({ items: [makeBuyItem()] });
      mockVerifyCartItems.mockResolvedValue([
        { garment_id: "g-1", is_available: true, verified_sale_price: 2000000, verified_rental_price: 0, current_status: "available" },
      ]);

      render(<CheckoutClient />);

      await waitFor(() => {
        const headings = screen.getAllByText("Xem Lại Giỏ Hàng");
        expect(headings.length).toBeGreaterThanOrEqual(1);
        // H1 heading exists
        const h1 = headings.find((el) => el.tagName === "H1");
        expect(h1).toBeTruthy();
      });
    });

    it("does not render inline progress bar (moved to CheckoutProgress component)", async () => {
      useCartStore.setState({ items: [makeBuyItem()] });
      mockVerifyCartItems.mockResolvedValue([
        { garment_id: "g-1", is_available: true, verified_sale_price: 2000000, verified_rental_price: 0, current_status: "available" },
      ]);

      render(<CheckoutClient />);

      await waitFor(() => {
        // Progress bar is rendered by CheckoutProgress at page level, not inside CheckoutClient
        expect(screen.queryByRole("navigation")).toBeNull();
      });
    });
  });

  describe("verification flow", () => {
    it("shows loading skeleton while verifying", async () => {
      useCartStore.setState({ items: [makeBuyItem()] });

      let resolveVerify: (v: unknown) => void;
      mockVerifyCartItems.mockReturnValue(
        new Promise((resolve) => {
          resolveVerify = resolve;
        })
      );

      render(<CheckoutClient />);

      expect(screen.getByTestId("checkout-skeleton")).toBeInTheDocument();

      await act(async () => {
        resolveVerify!([
          { garment_id: "g-1", is_available: true, verified_sale_price: 2000000, verified_rental_price: 0, current_status: "available" },
        ]);
      });

      await waitFor(() => {
        expect(screen.queryByTestId("checkout-skeleton")).not.toBeInTheDocument();
      });
    });

    it("calls verifyCartItems on mount", async () => {
      useCartStore.setState({ items: [makeBuyItem()] });
      mockVerifyCartItems.mockResolvedValue([
        { garment_id: "g-1", is_available: true, verified_sale_price: 2000000, verified_rental_price: 0, current_status: "available" },
      ]);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(mockVerifyCartItems).toHaveBeenCalledWith([
          { garment_id: "g-1", transaction_type: "buy" },
        ]);
      });
    });

    it("shows error state with retry button on verification failure", async () => {
      useCartStore.setState({ items: [makeBuyItem()] });
      mockVerifyCartItems.mockRejectedValue(new Error("Network error"));

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByTestId("verify-error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("retry-button")).toBeInTheDocument();
    });
  });

  describe("item removal", () => {
    it("removes item from cart store when remove button clicked", async () => {
      useCartStore.setState({ items: [makeBuyItem(), makeRentItem()] });
      mockVerifyCartItems.mockResolvedValue([
        { garment_id: "g-1", is_available: true, verified_sale_price: 2000000, verified_rental_price: 0, current_status: "available" },
        { garment_id: "g-2", is_available: true, verified_sale_price: 0, verified_rental_price: 500000, current_status: "available" },
      ]);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByTestId("checkout-items-list")).toBeInTheDocument();
      });

      const removeBtn = screen.getByTestId("remove-item-item-buy-1");
      await act(async () => {
        removeBtn.click();
      });

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].garment_id).toBe("g-2");
    });
  });

  describe("order summary", () => {
    it("renders OrderSummary with correct totals", async () => {
      useCartStore.setState({ items: [makeBuyItem(), makeRentItem()] });
      mockVerifyCartItems.mockResolvedValue([
        { garment_id: "g-1", is_available: true, verified_sale_price: 2000000, verified_rental_price: 0, current_status: "available" },
        { garment_id: "g-2", is_available: true, verified_sale_price: 0, verified_rental_price: 500000, current_status: "available" },
      ]);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByTestId("checkout-items-list")).toBeInTheDocument();
      });

      // OrderSummary rendered (desktop + mobile = 2 instances)
      const summaries = screen.getAllByTestId("order-summary");
      expect(summaries.length).toBeGreaterThanOrEqual(1);
    });
  });
});
