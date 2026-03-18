/**
 * Notification Server Action Tests — Story 4.4f
 * Tests: getMyNotifications, getUnreadNotificationCount, markNotificationRead,
 *        markAllNotificationsRead, deleteNotification
 */

import "@testing-library/jest-dom";

// Mock @/auth
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock global fetch
global.fetch = jest.fn();

import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/app/actions/profile-actions";

const MOCK_TOKEN = "test-jwt-token";

const MOCK_NOTIFICATION = {
  id: "notif-uuid-1",
  type: "order_status",
  title: "Đơn hàng đang được xử lý",
  message: "Đơn hàng #ABCD1234 của bạn đang được xử lý.",
  data: {},
  is_read: false,
  read_at: null,
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

// ─── getMyNotifications ───────────────────────────────────────────────────────

describe("getMyNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns notifications data on success", async () => {
    mockSession();
    mockFetch(200, {
      data: {
        notifications: [MOCK_NOTIFICATION],
        notification_count: 1,
      },
    });

    const result = await getMyNotifications();

    expect(result.success).toBe(true);
    expect(result.data?.notification_count).toBe(1);
    expect(result.data?.notifications).toHaveLength(1);
    expect(result.data?.notifications[0].type).toBe("order_status");
  });

  it("returns empty notifications list when user has none", async () => {
    mockSession();
    mockFetch(200, {
      data: { notifications: [], notification_count: 0 },
    });

    const result = await getMyNotifications();

    expect(result.success).toBe(true);
    expect(result.data?.notification_count).toBe(0);
    expect(result.data?.notifications).toHaveLength(0);
  });

  it("returns error when not authenticated", async () => {
    mockSession(null);

    const result = await getMyNotifications();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chưa đăng nhập");
  });

  it("returns error on 401 response", async () => {
    mockSession();
    mockFetch(401, {});

    const result = await getMyNotifications();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Phiên đăng nhập hết hạn");
  });

  it("returns error on server error (500)", async () => {
    mockSession();
    mockFetch(500, {});

    const result = await getMyNotifications();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Không thể tải thông báo");
  });

  it("returns network error on fetch failure", async () => {
    mockSession();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    const result = await getMyNotifications();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Lỗi kết nối");
  });

  it("returns timeout error on AbortError", async () => {
    mockSession();
    const abortError = new Error("AbortError");
    abortError.name = "AbortError";
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const result = await getMyNotifications();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Yêu cầu quá hạn, vui lòng thử lại");
  });
});

// ─── getUnreadNotificationCount ───────────────────────────────────────────────

describe("getUnreadNotificationCount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns unread count on success", async () => {
    mockSession();
    mockFetch(200, { data: { unread_count: 5 } });

    const result = await getUnreadNotificationCount();

    expect(result.success).toBe(true);
    expect(result.data?.unread_count).toBe(5);
  });

  it("returns zero count when no unread notifications", async () => {
    mockSession();
    mockFetch(200, { data: { unread_count: 0 } });

    const result = await getUnreadNotificationCount();

    expect(result.success).toBe(true);
    expect(result.data?.unread_count).toBe(0);
  });

  it("returns error when not authenticated", async () => {
    mockSession(null);

    const result = await getUnreadNotificationCount();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chưa đăng nhập");
  });

  it("returns error on 401 response", async () => {
    mockSession();
    mockFetch(401, {});

    const result = await getUnreadNotificationCount();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Phiên đăng nhập hết hạn");
  });

  it("returns network error on fetch failure", async () => {
    mockSession();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    const result = await getUnreadNotificationCount();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Lỗi kết nối");
  });
});

// ─── markNotificationRead ─────────────────────────────────────────────────────

describe("markNotificationRead", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks notification as read successfully", async () => {
    mockSession();
    mockFetch(200, { data: { ...MOCK_NOTIFICATION, is_read: true } });

    const result = await markNotificationRead("notif-uuid-1");

    expect(result.success).toBe(true);
  });

  it("returns error when notification not found (404)", async () => {
    mockSession();
    mockFetch(404, {});

    const result = await markNotificationRead("nonexistent-id");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Thông báo không tồn tại");
  });

  it("returns error when not authenticated", async () => {
    mockSession(null);

    const result = await markNotificationRead("notif-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chưa đăng nhập");
  });

  it("returns error on 401 response", async () => {
    mockSession();
    mockFetch(401, {});

    const result = await markNotificationRead("notif-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Phiên đăng nhập hết hạn");
  });

  it("returns network error on fetch failure", async () => {
    mockSession();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    const result = await markNotificationRead("notif-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Lỗi kết nối");
  });
});

// ─── markAllNotificationsRead ─────────────────────────────────────────────────

describe("markAllNotificationsRead", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks all notifications as read successfully", async () => {
    mockSession();
    mockFetch(200, { data: { updated_count: 3 } });

    const result = await markAllNotificationsRead();

    expect(result.success).toBe(true);
  });

  it("returns error when not authenticated", async () => {
    mockSession(null);

    const result = await markAllNotificationsRead();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chưa đăng nhập");
  });

  it("returns error on 401 response", async () => {
    mockSession();
    mockFetch(401, {});

    const result = await markAllNotificationsRead();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Phiên đăng nhập hết hạn");
  });

  it("returns network error on fetch failure", async () => {
    mockSession();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    const result = await markAllNotificationsRead();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Lỗi kết nối");
  });
});

// ─── deleteNotification ───────────────────────────────────────────────────────

describe("deleteNotification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes notification successfully", async () => {
    mockSession();
    mockFetch(204, null);

    const result = await deleteNotification("notif-uuid-1");

    expect(result.success).toBe(true);
  });

  it("returns error when notification not found (404)", async () => {
    mockSession();
    mockFetch(404, {});

    const result = await deleteNotification("nonexistent-id");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Thông báo không tồn tại");
  });

  it("returns error when not authenticated", async () => {
    mockSession(null);

    const result = await deleteNotification("notif-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chưa đăng nhập");
  });

  it("returns error on 401 response", async () => {
    mockSession();
    mockFetch(401, {});

    const result = await deleteNotification("notif-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Phiên đăng nhập hết hạn");
  });

  it("returns error on server error (500)", async () => {
    mockSession();
    mockFetch(500, {});

    const result = await deleteNotification("notif-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Không thể xóa thông báo");
  });

  it("returns network error on fetch failure", async () => {
    mockSession();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    const result = await deleteNotification("notif-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Lỗi kết nối");
  });

  it("returns timeout error on AbortError", async () => {
    mockSession();
    const abortError = new Error("AbortError");
    abortError.name = "AbortError";
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const result = await deleteNotification("notif-uuid-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Yêu cầu quá hạn, vui lòng thử lại");
  });
});
