/**
 * Measurement Server Action Tests — Story 4.4d
 * Tests: success, unauthorized, no profile (empty), network error, timeout
 */

import "@testing-library/jest-dom";

// Mock @/auth
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock global fetch
global.fetch = jest.fn();

import { getMyMeasurements } from "@/app/actions/profile-actions";

const MOCK_TOKEN = "test-jwt-token";

const MOCK_MEASUREMENT = {
  id: "m1",
  customer_profile_id: "cp1",
  tenant_id: "t1",
  neck: "34.00",
  shoulder_width: "38.00",
  bust: "88.00",
  waist: "68.00",
  hip: "92.00",
  top_length: "60.00",
  sleeve_length: "58.00",
  wrist: "15.00",
  height: "162.00",
  weight: "55.00",
  measurement_notes: null,
  is_default: true,
  measured_date: "2026-01-15",
  measured_by: null,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
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

describe("getMyMeasurements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns measurements data on success", async () => {
    mockSession();
    mockFetch(200, {
      data: {
        default_measurement: MOCK_MEASUREMENT,
        measurements: [MOCK_MEASUREMENT],
        measurement_count: 1,
      },
    });

    const result = await getMyMeasurements();

    expect(result.success).toBe(true);
    expect(result.data?.measurement_count).toBe(1);
    expect(result.data?.default_measurement?.is_default).toBe(true);
    expect(result.data?.measurements).toHaveLength(1);
  });

  it("returns empty data when no measurements (new customer)", async () => {
    mockSession();
    mockFetch(200, {
      data: {
        default_measurement: null,
        measurements: [],
        measurement_count: 0,
      },
    });

    const result = await getMyMeasurements();

    expect(result.success).toBe(true);
    expect(result.data?.measurement_count).toBe(0);
    expect(result.data?.default_measurement).toBeNull();
    expect(result.data?.measurements).toHaveLength(0);
  });

  it("returns error when not authenticated", async () => {
    mockSession(null);

    const result = await getMyMeasurements();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chưa đăng nhập");
  });

  it("returns error on 401 response", async () => {
    mockSession();
    mockFetch(401, {});

    const result = await getMyMeasurements();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Phiên đăng nhập hết hạn");
  });

  it("returns error on network error", async () => {
    mockSession();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    const result = await getMyMeasurements();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Lỗi kết nối");
  });

  it("returns timeout error on AbortError", async () => {
    mockSession();
    const abortError = new Error("AbortError");
    abortError.name = "AbortError";
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const result = await getMyMeasurements();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Yêu cầu quá hạn, vui lòng thử lại");
  });

  it("returns error on server error (500)", async () => {
    mockSession();
    mockFetch(500, {});

    const result = await getMyMeasurements();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Không thể tải số đo");
  });
});
