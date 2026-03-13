/**
 * Cart Actions Tests - Story 3.2: Render Cart Checkout Details
 * Tests for verifyCartItems server action.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

// Mock fetchGarmentDetail
const mockFetchGarmentDetail = jest.fn();
jest.mock("@/app/actions/garment-actions", () => ({
  fetchGarmentDetail: (...args: unknown[]) => mockFetchGarmentDetail(...args),
}));

// Import after mock
import { verifyCartItems } from "@/app/actions/cart-actions";

const makeGarment = (overrides: Record<string, unknown> = {}) => ({
  id: "g-1",
  tenant_id: "t-1",
  name: "Áo Dài Truyền Thống",
  description: null,
  category: "ao_dai_truyen_thong",
  color: "đỏ",
  occasion: null,
  material: "lua",
  size_options: ["S", "M", "L"],
  rental_price: "500000",
  sale_price: "2000000",
  image_url: "/img/ao-dai.jpg",
  image_urls: ["/img/ao-dai.jpg"],
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
  ...overrides,
});

describe("verifyCartItems", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns available result for existing garment", async () => {
    mockFetchGarmentDetail.mockResolvedValue(makeGarment());

    const results = await verifyCartItems([
      { garment_id: "g-1", transaction_type: "buy" },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      garment_id: "g-1",
      is_available: true,
      verified_rental_price: 500000,
      verified_sale_price: 2000000,
      current_status: "available",
    });
  });

  it("returns unavailable for rented garment", async () => {
    mockFetchGarmentDetail.mockResolvedValue(
      makeGarment({ status: "rented", rental_price: "500000", sale_price: "2000000" })
    );

    const results = await verifyCartItems([
      { garment_id: "g-1", transaction_type: "rent" },
    ]);

    expect(results[0].is_available).toBe(false);
    expect(results[0].current_status).toBe("rented");
  });

  it("returns unavailable with status 'deleted' for null garment", async () => {
    mockFetchGarmentDetail.mockResolvedValue(null);

    const results = await verifyCartItems([
      { garment_id: "g-deleted", transaction_type: "buy" },
    ]);

    expect(results[0]).toEqual({
      garment_id: "g-deleted",
      is_available: false,
      verified_rental_price: 0,
      verified_sale_price: 0,
      current_status: "deleted",
    });
  });

  it("handles fetch error gracefully", async () => {
    mockFetchGarmentDetail.mockRejectedValue(new Error("Network error"));

    const results = await verifyCartItems([
      { garment_id: "g-error", transaction_type: "buy" },
    ]);

    expect(results[0]).toEqual({
      garment_id: "g-error",
      is_available: false,
      verified_rental_price: 0,
      verified_sale_price: 0,
      current_status: "error",
    });
  });

  it("verifies multiple items in parallel", async () => {
    mockFetchGarmentDetail.mockImplementation(async (id: string) => {
      if (id === "g-1") return makeGarment({ id: "g-1" });
      if (id === "g-2") return makeGarment({ id: "g-2", status: "rented" });
      return null;
    });

    const results = await verifyCartItems([
      { garment_id: "g-1", transaction_type: "buy" },
      { garment_id: "g-2", transaction_type: "rent" },
      { garment_id: "g-3", transaction_type: "buy" },
    ]);

    expect(results).toHaveLength(3);
    expect(results[0].is_available).toBe(true);
    expect(results[1].is_available).toBe(false);
    expect(results[2].is_available).toBe(false);
    expect(results[2].current_status).toBe("deleted");
  });

  it("correctly parses string prices to numbers", async () => {
    mockFetchGarmentDetail.mockResolvedValue(
      makeGarment({ rental_price: "750000", sale_price: "3500000" })
    );

    const results = await verifyCartItems([
      { garment_id: "g-1", transaction_type: "buy" },
    ]);

    expect(results[0].verified_rental_price).toBe(750000);
    expect(results[0].verified_sale_price).toBe(3500000);
  });

  it("handles null sale_price gracefully", async () => {
    mockFetchGarmentDetail.mockResolvedValue(
      makeGarment({ sale_price: null })
    );

    const results = await verifyCartItems([
      { garment_id: "g-1", transaction_type: "buy" },
    ]);

    expect(results[0].verified_sale_price).toBe(0);
  });
});
