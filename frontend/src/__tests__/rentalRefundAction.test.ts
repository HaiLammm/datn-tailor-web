/**
 * Story 10.7b — refundSecurity server action tests.
 * Verifies the action calls the refund-security endpoint with the right body,
 * parses the response, and surfaces already_processed (idempotent replay).
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { refundSecurity } from "@/app/actions/order-actions";

const SESSION = { accessToken: "test-bearer-token" };

beforeEach(() => {
  mockFetch.mockReset();
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(SESSION);
});

describe("refundSecurity", () => {
  it("POSTs the condition to the refund-security endpoint and returns parsed data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          order_id: "order-1",
          refund_amount: 500000,
          security_type: "cash_deposit",
          original_amount: "500000",
          condition: "Good",
          already_processed: false,
        },
        meta: {},
      }),
    });

    const result = await refundSecurity("order-1", "Good");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/v1/orders/order-1/refund-security");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ condition: "Good" });
    expect(init.headers.Authorization).toBe("Bearer test-bearer-token");

    expect(result.refund_amount).toBe(500000);
    expect(result.condition).toBe("Good");
    expect(result.already_processed).toBe(false);
  });

  it("surfaces already_processed=true on idempotent replay (not an error)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          order_id: "order-1",
          refund_amount: 500000,
          security_type: "cash_deposit",
          original_amount: "500000",
          condition: "Good",
          already_processed: true,
        },
        meta: {},
      }),
    });

    const result = await refundSecurity("order-1", "Lost");
    expect(result.already_processed).toBe(true);
    expect(result.condition).toBe("Good"); // stored condition, not the new "Lost"
  });

  it("throws the backend error message on 422", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: { error: { code: "ERR_NOT_RETURNED", message: "Chỉ có thể hoàn trả cọc khi đơn ở trạng thái 'trả lại'" } },
      }),
    });

    await expect(refundSecurity("order-1", "Good")).rejects.toThrow(/trả lại/);
  });

  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(refundSecurity("order-1", "Good")).rejects.toThrow(/đăng nhập/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
