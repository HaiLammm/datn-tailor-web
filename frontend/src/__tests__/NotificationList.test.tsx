/**
 * NotificationList Component Tests — Story 4.4f
 * Tests: render list, empty state, error state, mark-read, mark-all-read,
 *        delete with confirm dialog, type icons/labels, unread badge
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock profile-actions
const mockMarkNotificationRead = jest.fn();
const mockMarkAllNotificationsRead = jest.fn();
const mockDeleteNotification = jest.fn();

jest.mock("@/app/actions/profile-actions", () => ({
  markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args),
  markAllNotificationsRead: (...args: unknown[]) => mockMarkAllNotificationsRead(...args),
  deleteNotification: (...args: unknown[]) => mockDeleteNotification(...args),
}));

import { NotificationList } from "@/components/client/profile/NotificationList";
import type { NotificationItem } from "@/types/notification";

// ─── Mock data ────────────────────────────────────────────────────────────────

function makeNotification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "notif-1",
    type: "order_status",
    title: "Đơn hàng đang được xử lý",
    message: "Đơn hàng #ABCD1234 của bạn đang được xử lý.",
    data: {},
    is_read: false,
    read_at: null,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    ...overrides,
  };
}

const UNREAD_NOTIF = makeNotification({ id: "notif-1", is_read: false });
const READ_NOTIF = makeNotification({
  id: "notif-2",
  is_read: true,
  read_at: "2026-03-18T09:00:00Z",
});
const APPT_NOTIF = makeNotification({
  id: "notif-3",
  type: "appointment",
  title: "Lịch hẹn đã được hủy",
  message: "Bạn đã hủy lịch hẹn vào ngày 25/03/2026.",
  is_read: false,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("NotificationList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // AC1, AC4: Render list with notifications
  it("renders notification list with title and message", () => {
    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF]}
        initialUnreadCount={1}
      />
    );

    expect(screen.getByText("Thông báo")).toBeInTheDocument();
    expect(screen.getByText("Đơn hàng đang được xử lý")).toBeInTheDocument();
    expect(screen.getByText("Đơn hàng #ABCD1234 của bạn đang được xử lý.")).toBeInTheDocument();
  });

  // AC4: Type label shown
  it("renders type label for order_status notification", () => {
    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF]}
        initialUnreadCount={1}
      />
    );
    expect(screen.getByText("Đơn hàng")).toBeInTheDocument();
  });

  it("renders type label for appointment notification", () => {
    render(
      <NotificationList
        initialNotifications={[APPT_NOTIF]}
        initialUnreadCount={1}
      />
    );
    expect(screen.getByText("Lịch hẹn")).toBeInTheDocument();
  });

  // AC2: Unread badge in header
  it("shows unread count badge when there are unread notifications", () => {
    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF]}
        initialUnreadCount={3}
      />
    );
    // The badge number
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("does not show unread badge when unreadCount is 0", () => {
    render(
      <NotificationList
        initialNotifications={[READ_NOTIF]}
        initialUnreadCount={0}
      />
    );
    // No badge
    const header = screen.getByRole("heading", { level: 2 });
    expect(header.textContent).toBe("Thông báo");
  });

  // AC3: Mark all read button visible only when unread > 0
  it("shows 'Đánh dấu tất cả đã đọc' button when unread notifications exist", () => {
    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF]}
        initialUnreadCount={1}
      />
    );
    expect(screen.getByText("Đánh dấu tất cả đã đọc")).toBeInTheDocument();
  });

  it("hides 'Đánh dấu tất cả đã đọc' button when all notifications are read", () => {
    render(
      <NotificationList
        initialNotifications={[READ_NOTIF]}
        initialUnreadCount={0}
      />
    );
    expect(screen.queryByText("Đánh dấu tất cả đã đọc")).not.toBeInTheDocument();
  });

  // AC5: Empty state
  it("renders empty state when no notifications", () => {
    render(
      <NotificationList
        initialNotifications={[]}
        initialUnreadCount={0}
      />
    );
    expect(screen.getByText("Chưa có thông báo nào")).toBeInTheDocument();
    expect(screen.getByText(/Thông báo về đơn hàng/)).toBeInTheDocument();
  });

  // AC8: Error state
  it("renders error state with retry button when hasError is true", () => {
    render(
      <NotificationList
        initialNotifications={[]}
        initialUnreadCount={0}
        hasError={true}
      />
    );
    expect(screen.getByText("Không thể tải thông báo")).toBeInTheDocument();
    expect(screen.getByText("Thử lại")).toBeInTheDocument();
  });

  // AC3: Optimistic mark-read on click
  it("marks notification as read on click (optimistic update)", async () => {
    mockMarkNotificationRead.mockResolvedValue({ success: true });

    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF]}
        initialUnreadCount={1}
      />
    );

    // Click the unread notification row
    const notifRow = screen.getByRole("button", { name: /Đánh dấu đã đọc/ });
    fireEvent.click(notifRow);

    await waitFor(() => {
      expect(mockMarkNotificationRead).toHaveBeenCalledWith("notif-1");
    });
  });

  it("reverts optimistic read on markNotificationRead failure", async () => {
    mockMarkNotificationRead.mockResolvedValue({ success: false, error: "Lỗi" });

    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF]}
        initialUnreadCount={1}
      />
    );

    const notifRow = screen.getByRole("button", { name: /Đánh dấu đã đọc/ });
    fireEvent.click(notifRow);

    await waitFor(() => {
      expect(screen.getByText("Không thể đánh dấu đã đọc")).toBeInTheDocument();
    });
  });

  // AC3: Mark all read
  it("calls markAllNotificationsRead when button is clicked", async () => {
    mockMarkAllNotificationsRead.mockResolvedValue({ success: true });

    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF]}
        initialUnreadCount={1}
      />
    );

    fireEvent.click(screen.getByText("Đánh dấu tất cả đã đọc"));

    await waitFor(() => {
      expect(mockMarkAllNotificationsRead).toHaveBeenCalled();
    });
  });

  // AC6: Delete with inline confirm
  it("shows inline confirm dialog when trash icon is clicked", () => {
    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF]}
        initialUnreadCount={1}
      />
    );

    const deleteBtn = screen.getByLabelText(/Xóa thông báo: Đơn hàng đang được xử lý/);
    fireEvent.click(deleteBtn);

    expect(screen.getByText("Xóa thông báo này?")).toBeInTheDocument();
    expect(screen.getByText("Xóa")).toBeInTheDocument();
    expect(screen.getByText("Hủy")).toBeInTheDocument();
  });

  it("dismisses confirm dialog when 'Hủy' is clicked", () => {
    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF]}
        initialUnreadCount={1}
      />
    );

    const deleteBtn = screen.getByLabelText(/Xóa thông báo: Đơn hàng đang được xử lý/);
    fireEvent.click(deleteBtn);
    fireEvent.click(screen.getByText("Hủy"));

    expect(screen.queryByText("Xóa thông báo này?")).not.toBeInTheDocument();
  });

  it("calls deleteNotification and removes item on confirm", async () => {
    mockDeleteNotification.mockResolvedValue({ success: true });

    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF]}
        initialUnreadCount={1}
      />
    );

    const deleteBtn = screen.getByLabelText(/Xóa thông báo: Đơn hàng đang được xử lý/);
    fireEvent.click(deleteBtn);
    fireEvent.click(screen.getByLabelText("Xác nhận xóa thông báo"));

    await waitFor(() => {
      expect(mockDeleteNotification).toHaveBeenCalledWith("notif-1");
    });

    await waitFor(() => {
      expect(screen.queryByText("Đơn hàng đang được xử lý")).not.toBeInTheDocument();
    });
  });

  it("shows error toast when deleteNotification fails", async () => {
    mockDeleteNotification.mockResolvedValue({ success: false, error: "Lỗi" });

    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF]}
        initialUnreadCount={1}
      />
    );

    const deleteBtn = screen.getByLabelText(/Xóa thông báo: Đơn hàng đang được xử lý/);
    fireEvent.click(deleteBtn);
    fireEvent.click(screen.getByLabelText("Xác nhận xóa thông báo"));

    await waitFor(() => {
      expect(screen.getByText("Không thể xóa thông báo")).toBeInTheDocument();
    });
  });

  // Multiple notifications
  it("renders multiple notifications correctly", () => {
    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF, READ_NOTIF, APPT_NOTIF]}
        initialUnreadCount={2}
      />
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  // Relative time display
  it("shows relative time for recent notification", () => {
    render(
      <NotificationList
        initialNotifications={[UNREAD_NOTIF]}
        initialUnreadCount={1}
      />
    );
    // 5 minutes ago
    expect(screen.getByText("5 phút trước")).toBeInTheDocument();
  });
});
