/**
 * Voucher Server Action Tests — Story 4.4g
 * Tests: getMyVouchers — success, empty, unauthorized, network error, timeout
 */

import "@testing-library/jest-dom";

// Mock @/auth
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock global fetch
global.fetch = jest.fn();

import { getMyVouchers } from "@/app/actions/profile-actions";

const MOCK_TOKEN = "test-jwt-token";

const MOCK_VOUCHER = {
  id: "uv-1",
  voucher_id: "v-1",
  code: "TET2026",
  type: "percent",
  value: "10.00",
  min_order_value: "500000.00",
  max_discount_value: "100000.00",
  description: "Giảm 10% dịp Tết",
  expiry_date: "2099-12-31",
  status: "active",
  assigned_at: "2026-03-01T00:00:00Z",
};

function mockSession(token: string | null = MOCK_TOKEN) {
  mockAuth.mockResolvedValue(token ? { accessToken: token } : null);
}

function mockFetch(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

// ─── getMyVouchers ────────────────────────────────────────────────────────────

describe("getMyVouchers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns vouchers data on success", async () => {
    mockSession();
    mockFetch(200, {
      data: {
        vouchers: [MOCK_VOUCHER],
        voucher_count: 1,
      },
      meta: {},
    });

    const result = await getMyVouchers();

    expect(result.success).toBe(true);
    expect(result.data?.voucher_count).toBe(1);
    expect(result.data?.vouchers).toHaveLength(1);
    expect(result.data?.vouchers[0].code).toBe("TET2026");
    expect(result.data?.vouchers[0].status).toBe("active");
  });

  it("returns decimal fields as strings (lesson from 4.4d)", async () => {
    mockSession();
    mockFetch(200, {
      data: {
        vouchers: [MOCK_VOUCHER],
        voucher_count: 1,
      },
      meta: {},
    });

    const result = await getMyVouchers();

    expect(result.success).toBe(true);
    // value must be string "10.00", not number 10
    expect(typeof result.data?.vouchers[0].value).toBe("string");
    expect(typeof result.data?.vouchers[0].min_order_value).toBe("string");
  });

  it("returns empty vouchers list when user has none", async () => {
    mockSession();
    mockFetch(200, {
      data: { vouchers: [], voucher_count: 0 },
      meta: {},
    });

    const result = await getMyVouchers();

    expect(result.success).toBe(true);
    expect(result.data?.voucher_count).toBe(0);
    expect(result.data?.vouchers).toHaveLength(0);
  });

  it("returns error when no session (no token)", async () => {
    mockSession(null);

    const result = await getMyVouchers();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chưa đăng nhập");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns error message on 401 response", async () => {
    mockSession();
    mockFetch(401, { error: { code: "UNAUTHORIZED", message: "Token hết hạn" } });

    const result = await getMyVouchers();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Phiên đăng nhập hết hạn");
  });

  it("returns error on non-OK response (500)", async () => {
    mockSession();
    mockFetch(500, { error: { code: "INTERNAL_ERROR" } });

    const result = await getMyVouchers();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Không thể tải danh sách voucher");
  });

  it("returns connection error on network failure", async () => {
    mockSession();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));

    const result = await getMyVouchers();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Lỗi kết nối");
  });

  it("returns timeout error on AbortError", async () => {
    mockSession();
    const abortError = new Error("The user aborted a request.");
    abortError.name = "AbortError";
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const result = await getMyVouchers();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Yêu cầu quá hạn, vui lòng thử lại");
  });

  it("sends Authorization header with Bearer token", async () => {
    mockSession(MOCK_TOKEN);
    mockFetch(200, {
      data: { vouchers: [], voucher_count: 0 },
      meta: {},
    });

    await getMyVouchers();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/customers/me/vouchers"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${MOCK_TOKEN}`,
        }),
      })
    );
  });

  it("sends GET request with cache: no-store", async () => {
    mockSession();
    mockFetch(200, {
      data: { vouchers: [], voucher_count: 0 },
      meta: {},
    });

    await getMyVouchers();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      })
    );
  });
});
