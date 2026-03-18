/**
 * Appointment Server Action Tests — Story 4.4e
 * Tests: getMyAppointments success/unauthorized/error, cancelMyAppointment success/within-24h/not-found/error
 */

import "@testing-library/jest-dom";

// Mock @/auth
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock global fetch
global.fetch = jest.fn();

import { getMyAppointments, cancelMyAppointment } from "@/app/actions/profile-actions";

const MOCK_TOKEN = "test-jwt-token";

const MOCK_APPOINTMENT = {
  id: "appt-uuid-1",
  customer_name: "Nguyễn Thị Linh",
  customer_phone: "0931234567",
  customer_email: "linh@example.com",
  appointment_date: "2026-03-25",
  slot: "morning" as const,
  status: "confirmed" as const,
  special_requests: "Tư vấn áo dài cưới",
  created_at: "2026-03-18T10:00:00Z",
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

// ─── getMyAppointments ────────────────────────────────────────────────────────

describe("getMyAppointments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns appointments data on success", async () => {
    mockSession();
    mockFetch(200, {
      data: {
        appointments: [MOCK_APPOINTMENT],
        appointment_count: 1,
      },
    });

    const result = await getMyAppointments();

    expect(result.success).toBe(true);
    expect(result.data?.appointment_count).toBe(1);
    expect(result.data?.appointments).toHaveLength(1);
    expect(result.data?.appointments[0].customer_email).toBe("linh@example.com");
  });

  it("returns empty appointments when customer has none", async () => {
    mockSession();
    mockFetch(200, {
      data: {
        appointments: [],
        appointment_count: 0,
      },
    });

    const result = await getMyAppointments();

    expect(result.success).toBe(true);
    expect(result.data?.appointment_count).toBe(0);
    expect(result.data?.appointments).toHaveLength(0);
  });

  it("returns error when not authenticated", async () => {
    mockSession(null);

    const result = await getMyAppointments();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chưa đăng nhập");
  });

  it("returns error on 401 response", async () => {
    mockSession();
    mockFetch(401, {});

    const result = await getMyAppointments();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Phiên đăng nhập hết hạn");
  });

  it("returns error on server error (500)", async () => {
    mockSession();
    mockFetch(500, {});

    const result = await getMyAppointments();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Không thể tải lịch hẹn");
  });

  it("returns network error on fetch failure", async () => {
    mockSession();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    const result = await getMyAppointments();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Lỗi kết nối");
  });

  it("returns timeout error on AbortError", async () => {
    mockSession();
    const abortError = new Error("AbortError");
    abortError.name = "AbortError";
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const result = await getMyAppointments();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Yêu cầu quá hạn, vui lòng thử lại");
  });
});

// ─── cancelMyAppointment ──────────────────────────────────────────────────────

describe("cancelMyAppointment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cancels appointment successfully", async () => {
    mockSession();
    mockFetch(200, {
      data: { ...MOCK_APPOINTMENT, status: "cancelled" },
    });

    const result = await cancelMyAppointment("appt-uuid-1");

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("cancelled");
  });

  it("returns error when appointment is within 24h (400)", async () => {
    mockSession();
    mockFetch(400, {
      detail: {
        code: "WITHIN_24H",
        message: "Không thể hủy trong vòng 24h trước giờ hẹn",
      },
    });

    const result = await cancelMyAppointment("appt-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Không thể hủy trong vòng 24h trước giờ hẹn");
  });

  it("returns error when appointment not found (404)", async () => {
    mockSession();
    mockFetch(404, {});

    const result = await cancelMyAppointment("nonexistent-id");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Lịch hẹn không tồn tại");
  });

  it("returns error when appointment already cancelled (409)", async () => {
    mockSession();
    mockFetch(409, {});

    const result = await cancelMyAppointment("appt-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Lịch hẹn đã được hủy trước đó");
  });

  it("returns error when not authenticated", async () => {
    mockSession(null);

    const result = await cancelMyAppointment("appt-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chưa đăng nhập");
  });

  it("returns network error on fetch failure", async () => {
    mockSession();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    const result = await cancelMyAppointment("appt-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Lỗi kết nối");
  });

  it("returns timeout error on AbortError", async () => {
    mockSession();
    const abortError = new Error("AbortError");
    abortError.name = "AbortError";
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const result = await cancelMyAppointment("appt-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Yêu cầu quá hạn, vui lòng thử lại");
  });

  it("returns error on server error (500)", async () => {
    mockSession();
    mockFetch(500, {});

    const result = await cancelMyAppointment("appt-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Không thể hủy lịch hẹn");
  });
});
