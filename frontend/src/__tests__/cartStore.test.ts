/**
 * Cart Store Tests - Story 3.1: Cart State Management
 * Tests Zustand store for cart state management with persist.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { useCartStore } from "@/store/cartStore";
import type { CartItem } from "@/types/cart";

// Mock localStorage for persist middleware
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

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
  rental_days: 2,
  unit_price: 500000,
  total_price: 1000000,
  ...overrides,
});

describe("useCartStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    useCartStore.setState({ items: [] });
  });

  afterEach(() => {
    useCartStore.setState({ items: [] });
  });

  describe("addItem", () => {
    it("adds a buy item to cart", () => {
      const item = makeBuyItem();
      useCartStore.getState().addItem(item);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0]).toEqual(item);
    });

    it("adds a rent item to cart", () => {
      const item = makeRentItem();
      useCartStore.getState().addItem(item);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0]).toEqual(item);
    });

    it("prevents duplicate buy item (same garment_id + type + size)", () => {
      const item = makeBuyItem();
      useCartStore.getState().addItem(item);
      useCartStore.getState().addItem(item);
      expect(useCartStore.getState().items).toHaveLength(1);
    });

    it("allows same garment in different sizes (buy)", () => {
      const itemM = makeBuyItem({ id: "item-m", size: "M" });
      const itemL = makeBuyItem({ id: "item-l", size: "L" });
      useCartStore.getState().addItem(itemM);
      useCartStore.getState().addItem(itemL);
      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it("prevents duplicate rent item (same garment_id + type + dates)", () => {
      const item = makeRentItem();
      useCartStore.getState().addItem(item);
      useCartStore.getState().addItem({ ...item, id: "item-rent-2" });
      expect(useCartStore.getState().items).toHaveLength(1);
    });

    it("allows same garment rented on different dates", () => {
      const item1 = makeRentItem({ id: "r1", start_date: "2026-04-01", end_date: "2026-04-03" });
      const item2 = makeRentItem({ id: "r2", start_date: "2026-05-01", end_date: "2026-05-03" });
      useCartStore.getState().addItem(item1);
      useCartStore.getState().addItem(item2);
      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it("allows same garment as both buy and rent", () => {
      const buyItem = makeBuyItem({ id: "buy-1", garment_id: "g-shared" });
      const rentItem = makeRentItem({ id: "rent-1", garment_id: "g-shared" });
      useCartStore.getState().addItem(buyItem);
      useCartStore.getState().addItem(rentItem);
      expect(useCartStore.getState().items).toHaveLength(2);
    });
  });

  describe("removeItem", () => {
    it("removes item by id", () => {
      const item = makeBuyItem();
      useCartStore.getState().addItem(item);
      useCartStore.getState().removeItem("item-buy-1");
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("only removes the specified item", () => {
      const item1 = makeBuyItem({ id: "a" });
      const item2 = makeBuyItem({ id: "b", size: "L" });
      useCartStore.getState().addItem(item1);
      useCartStore.getState().addItem(item2);
      useCartStore.getState().removeItem("a");
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].id).toBe("b");
    });

    it("does nothing when id not found", () => {
      const item = makeBuyItem();
      useCartStore.getState().addItem(item);
      useCartStore.getState().removeItem("non-existent");
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe("clearCart", () => {
    it("clears all items", () => {
      useCartStore.getState().addItem(makeBuyItem());
      useCartStore.getState().addItem(makeRentItem());
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe("cartCount computed", () => {
    it("returns 0 when cart is empty", () => {
      expect(useCartStore.getState().cartCount()).toBe(0);
    });

    it("returns count of all items", () => {
      useCartStore.getState().addItem(makeBuyItem());
      useCartStore.getState().addItem(makeRentItem());
      expect(useCartStore.getState().cartCount()).toBe(2);
    });
  });

  describe("cartTotal computed", () => {
    it("returns 0 when cart is empty", () => {
      expect(useCartStore.getState().cartTotal()).toBe(0);
    });

    it("sums all item total_prices", () => {
      const buyItem = makeBuyItem({ total_price: 2000000 });
      const rentItem = makeRentItem({ total_price: 1000000 });
      useCartStore.getState().addItem(buyItem);
      useCartStore.getState().addItem(rentItem);
      expect(useCartStore.getState().cartTotal()).toBe(3000000);
    });
  });
});
