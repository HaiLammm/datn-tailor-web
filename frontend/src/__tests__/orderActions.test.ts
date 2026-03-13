/**
 * Order Actions Tests - Story 3.3: Checkout Information & Payment Gateway
 * Tests for createOrder and getOrder server actions.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mock setup
import { createOrder, getOrder } from "@/app/actions/order-actions";

const VALID_ORDER_INPUT = {
  customer_name: "Nguyễn Văn A",
  customer_phone: "0912345678",
  shipping_address: {
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    address_detail: "123 Nguyễn Huệ",
  },
  payment_method: "cod" as const,
  items: [
    {
      garment_id: "garment-1",
      transaction_type: "buy" as const,
      size: "M",
    },
  ],
};

const MOCK_ORDER_RESPONSE = {
  id: "order-123",
  status: "pending",
  total_amount: 1200000,
  payment_method: "cod",
  payment_url: null,
  customer_name: "Nguyễn Văn A",
  customer_phone: "0912345678",
  shipping_address: VALID_ORDER_INPUT.shipping_address,
  shipping_note: null,
  items: [
    {
      garment_id: "garment-1",
      garment_name: "Áo Dài Đỏ",
      image_url: "/img/ao-dai.jpg",
      transaction_type: "buy",
      size: "M",
      rental_days: null,
      unit_price: 1200000,
      total_price: 1200000,
    },
  ],
  created_at: "2026-03-11T00:00:00Z",
};

describe("createOrder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns success with order data on 201", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ data: MOCK_ORDER_RESPONSE, meta: {} }),
    });

    const result = await createOrder(VALID_ORDER_INPUT);

    expect(result.success).toBe(true);
    expect(result.data?.order_id).toBe("order-123");
    expect(result.data?.status).toBe("pending");
    expect(result.data?.payment_url).toBeNull();
  });

  it("returns payment_url for VNPay", async () => {
    const mockWithPaymentUrl = {
      ...MOCK_ORDER_RESPONSE,
      payment_method: "vnpay",
      payment_url: "/checkout/confirmation?orderId=order-123&status=success",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ data: mockWithPaymentUrl, meta: {} }),
    });

    const result = await createOrder({
      ...VALID_ORDER_INPUT,
      payment_method: "vnpay",
    });

    expect(result.success).toBe(true);
    expect(result.data?.payment_url).toBeTruthy();
  });

  it("returns error on 404 garment not found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          code: "ERR_GARMENT_NOT_FOUND",
          message: "Sản phẩm không tồn tại",
        },
      }),
    });

    const result = await createOrder(VALID_ORDER_INPUT);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns error on 422 item unavailable", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        error: {
          code: "ERR_ITEM_UNAVAILABLE",
          message: "Sản phẩm không khả dụng",
        },
      }),
    });

    const result = await createOrder(VALID_ORDER_INPUT);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns error on 400 bad request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: { code: "ERR_INVALID", message: "Dữ liệu không hợp lệ" },
      }),
    });

    const result = await createOrder(VALID_ORDER_INPUT);

    expect(result.success).toBe(false);
  });

  it("returns error on generic server error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const result = await createOrder(VALID_ORDER_INPUT);

    expect(result.success).toBe(false);
    expect(result.error).toContain("500");
  });

  it("returns timeout error on AbortError", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValueOnce(abortError);

    const result = await createOrder(VALID_ORDER_INPUT);

    expect(result.success).toBe(false);
    expect(result.error).toContain("hết thời gian");
  });
});

describe("getOrder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns order data on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: MOCK_ORDER_RESPONSE }),
    });

    const result = await getOrder("order-123");

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("order-123");
    expect(result.data?.status).toBe("pending");
  });

  it("returns error on 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    const result = await getOrder("nonexistent-id");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns error on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await getOrder("order-123");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
