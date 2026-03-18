"use client";

/**
 * NotificationList — Story 4.4f: Thông báo (Notifications)
 *
 * Client Component: receives initial data from Server Component page.
 * Features:
 *  - List with type icons and colors (AC1, AC4)
 *  - Mark as read on click (optimistic UI) (AC3)
 *  - "Mark all read" button (AC3)
 *  - Delete with inline confirm dialog (AC6)
 *  - Empty state (AC5)
 *  - Skeleton loading and error + retry (AC8)
 *  - Responsive layout (AC8)
 */

import { useRef, useState } from "react";

import type { NotificationItem, NotificationType } from "@/types/notification";
import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/profile-actions";

// ─── Relative time helper ─────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

// ─── Type icons (inline SVG, no external library) ────────────────────────────

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

// ─── Notification type config ─────────────────────────────────────────────────

interface TypeConfig {
  iconComponent: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
}

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  order_status: {
    iconComponent: PackageIcon,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    label: "Đơn hàng",
  },
  appointment: {
    iconComponent: CalendarIcon,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    label: "Lịch hẹn",
  },
  return_reminder: {
    iconComponent: ClockIcon,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    label: "Nhắc trả đồ",
  },
  payment: {
    iconComponent: CreditCardIcon,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    label: "Thanh toán",
  },
  system: {
    iconComponent: InfoIcon,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    label: "Hệ thống",
  },
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-4 border-b border-gray-100 last:border-0">
          <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyNotifications() {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Chưa có thông báo nào</h3>
      <p className="text-sm text-gray-500 max-w-xs mx-auto">
        Thông báo về đơn hàng, lịch hẹn và ưu đãi sẽ hiển thị tại đây
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
  hasError?: boolean;
}

export function NotificationList({
  initialNotifications,
  initialUnreadCount,
  hasError = false,
}: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [error, setError] = useState<string | null>(hasError ? "Không thể tải thông báo" : null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Toast helper ────────────────────────────────────────────────────────────
  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 3000);
  }

  // ── Mark single notification as read (optimistic) ──────────────────────────
  async function handleMarkRead(notificationId: string) {
    const prev = notifications.find((n) => n.id === notificationId);
    if (!prev || prev.is_read) return;

    // Optimistic update
    setNotifications((ns) =>
      ns.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    const result = await markNotificationRead(notificationId);
    if (!result.success) {
      // Revert on failure
      setNotifications((ns) =>
        ns.map((n) => (n.id === notificationId ? { ...n, is_read: false, read_at: null } : n))
      );
      setUnreadCount((c) => c + 1);
      showToast("Không thể đánh dấu đã đọc");
    }
  }

  // ── Mark all as read ───────────────────────────────────────────────────────
  async function handleMarkAllRead() {
    if (unreadCount === 0) return;

    const prevNotifs = notifications;
    const prevCount = unreadCount;

    // Optimistic update
    setNotifications((ns) => ns.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);

    const result = await markAllNotificationsRead();
    if (!result.success) {
      setNotifications(prevNotifs);
      setUnreadCount(prevCount);
      showToast("Không thể đánh dấu đã đọc");
    }
  }

  // ── Delete notification ────────────────────────────────────────────────────
  async function handleDelete(notificationId: string) {
    setConfirmDeleteId(null);

    const prev = notifications;
    const wasUnread = notifications.find((n) => n.id === notificationId)?.is_read === false;

    // Optimistic update
    setNotifications((ns) => ns.filter((n) => n.id !== notificationId));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));

    const result = await deleteNotification(notificationId);
    if (!result.success) {
      setNotifications(prev);
      if (wasUnread) setUnreadCount((c) => c + 1);
      showToast("Không thể xóa thông báo");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-serif font-bold text-gray-900">Thông báo</h2>
        </div>
        <NotificationSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-serif font-bold text-gray-900">Thông báo</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <EmptyNotifications />
      ) : (
        <ul role="list" className="divide-y divide-gray-100">
          {notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type as NotificationType] ?? TYPE_CONFIG.system;
            const IconComponent = config.iconComponent;
            const isConfirmingDelete = confirmDeleteId === notif.id;

            return (
              <li key={notif.id}>
                <div
                  className={`flex items-start gap-3 px-4 py-4 transition-colors ${
                    notif.is_read ? "bg-white" : "bg-indigo-50"
                  } ${!notif.is_read ? "cursor-pointer hover:bg-indigo-100" : ""}`}
                  onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                  role={!notif.is_read ? "button" : undefined}
                  tabIndex={!notif.is_read ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (!notif.is_read && (e.key === "Enter" || e.key === " ")) {
                      handleMarkRead(notif.id);
                    }
                  }}
                  aria-label={!notif.is_read ? `Đánh dấu đã đọc: ${notif.title}` : undefined}
                >
                  {/* Type icon */}
                  <div
                    className={`w-10 h-10 ${config.iconBg} rounded-full flex items-center justify-center shrink-0 mt-0.5`}
                    aria-hidden="true"
                  >
                    <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold truncate ${
                            notif.is_read ? "text-gray-700" : "text-gray-900"
                          }`}
                        >
                          {notif.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notif.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${config.iconBg} ${config.iconColor} font-medium`}
                          >
                            {config.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {getRelativeTime(notif.created_at)}
                          </span>
                          {!notif.is_read && (
                            <span className="w-2 h-2 bg-indigo-500 rounded-full" aria-label="Chưa đọc" />
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
                      <div
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                            <span className="text-xs text-red-700 font-medium whitespace-nowrap">
                              Xóa thông báo này?
                            </span>
                            <button
                              onClick={() => handleDelete(notif.id)}
                              className="text-xs text-white bg-red-600 hover:bg-red-700 rounded px-2 py-0.5 font-medium transition-colors min-w-[44px] min-h-[28px]"
                              aria-label="Xác nhận xóa thông báo"
                            >
                              Xóa
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs text-gray-600 hover:text-gray-800 px-1 py-0.5 min-w-[44px] min-h-[28px]"
                              aria-label="Hủy xóa thông báo"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(notif.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label={`Xóa thông báo: ${notif.title}`}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Toast */}
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-indigo-900 text-white text-sm rounded-xl shadow-2xl px-5 py-3 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
