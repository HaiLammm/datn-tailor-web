/**
 * Order Actions Tests - Story 3.3: Checkout Information & Payment Gateway
 * Extended for Story 4.4c: Customer Order History actions.
 * Tests for createOrder, getOrder, getCustomerOrders, getCustomerOrderDetail, downloadOrderInvoice.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

// Mock auth (needed for customer actions)
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mock setup
import {
  createOrder,
  getOrder,
  getCustomerOrders,
  getCustomerOrderDetail,
  downloadOrderInvoice,
} from "@/app/actions/order-actions";

const SESSION_WITH_TOKEN = { accessToken: "test-bearer-token" };

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

beforeEach(() => {
  jest.clearAllMocks();
  // Default: not logged in for tests that don't need auth
  mockAuth.mockResolvedValue(null);
});

describe("createOrder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(null);
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
    mockAuth.mockResolvedValue(null);
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

// ──────────────────────────────────────────────────────────────────────────────
// Story 4.4c: Customer Order History action tests
// ──────────────────────────────────────────────────────────────────────────────

const MOCK_CUSTOMER_SUMMARY = {
  id: "order-001",
  order_number: "ORD-20260318-ABC123",
  total_amount: 1200000,
  status: "delivered",
  payment_status: "paid",
  order_type: "buy",
  created_at: "2026-03-18T10:00:00Z",
};

const MOCK_CUSTOMER_DETAIL = {
  ...MOCK_CUSTOMER_SUMMARY,
  payment_method: "cod",
  shipping_note: null,
  items: [
    {
      garment_id: "g-001",
      garment_name: "Áo Dài Lụa",
      image_url: null,
      transaction_type: "buy",
      size: "M",
      quantity: 1,
      unit_price: 1200000,
      total_price: 1200000,
    },
  ],
  delivery_info: {
    recipient_name: "Nguyễn Thị Linh",
    phone: "0901234567",
    address: "123 Nguyễn Huệ, Q.1",
    notes: null,
  },
  timeline: [
    { status: "pending", timestamp: "2026-03-18T10:00:00Z", description: "Đơn hàng được tạo" },
    { status: "delivered", timestamp: "2026-03-20T14:00:00Z", description: "Giao hàng thành công" },
  ],
};

describe("getCustomerOrders — Story 4.4c", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(SESSION_WITH_TOKEN);
  });

  it("returns order list on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [MOCK_CUSTOMER_SUMMARY],
        meta: { total: 1, page: 1, limit: 10, total_pages: 1 },
      }),
    });

    const result = await getCustomerOrders();
    expect(result.success).toBe(true);
    expect(result.data?.data).toHaveLength(1);
    expect(result.data?.meta.total).toBe(1);
  });

  it("returns error when unauthorized (401)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });

    const result = await getCustomerOrders();
    expect(result.success).toBe(false);
    expect(result.error).toContain("hết hạn");
  });

  it("appends filter and pagination params to URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [], meta: { total: 0, page: 2, limit: 10, total_pages: 0 } }),
    });

    await getCustomerOrders({ status: "delivered", order_type: "buy" }, { page: 2, limit: 10 });

    const url = (mockFetch.mock.calls[0][0] as string);
    expect(url).toContain("status=delivered");
    expect(url).toContain("order_type=buy");
    expect(url).toContain("page=2");
  });
});

describe("getCustomerOrderDetail — Story 4.4c", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(SESSION_WITH_TOKEN);
  });

  it("returns order detail on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: MOCK_CUSTOMER_DETAIL }),
    });

    const result = await getCustomerOrderDetail("order-001");
    expect(result.success).toBe(true);
    expect(result.data?.order_number).toBe("ORD-20260318-ABC123");
    expect(result.data?.items).toHaveLength(1);
    expect(result.data?.timeline).toHaveLength(2);
  });

  it("returns error when order not found (404)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });

    const result = await getCustomerOrderDetail("nonexistent-id");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Không tìm thấy");
  });
});

describe("downloadOrderInvoice — Story 4.4c", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(SESSION_WITH_TOKEN);
  });

  it("returns HTML content on success", async () => {
    const mockHtml = "<html><body>HÓA ĐƠN ORD-001</body></html>";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => mockHtml,
    });

    const result = await downloadOrderInvoice("order-001");
    expect(result.success).toBe(true);
    expect(result.htmlContent).toContain("HÓA ĐƠN");
  });

  it("returns error when invoice not found (404)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => "" });

    const result = await downloadOrderInvoice("nonexistent-id");
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
