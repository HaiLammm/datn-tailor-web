"use client";

/**
 * NotificationBell — Notification bell dropdown for the navbar.
 *
 * Fetches notifications on open, shows unread badge, allows marking as read.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

import type { NotificationItem, NotificationType } from "@/types/notification";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
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

// ─── Type icons (lightweight inline SVGs) ────────────────────────────────────

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

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

// ─── Type config ─────────────────────────────────────────────────────────────

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
  voucher: {
    iconComponent: GiftIcon,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    label: "Voucher",
  },
};

// ─── Skeleton loader ─────────────────────────────────────────────────────────

function DropdownSkeleton() {
  return (
    <div className="animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
          <div className="w-9 h-9 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Fetch notifications ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [notifResult, countResult] = await Promise.all([
        getMyNotifications(),
        getUnreadNotificationCount(),
      ]);

      if (notifResult.success && notifResult.data) {
        setNotifications(notifResult.data.notifications);
      } else {
        setError("Không thể tải thông báo");
      }

      if (countResult.success && countResult.data) {
        setUnreadCount(countResult.data.unread_count);
      }
    } catch {
      setError("Không thể tải thông báo");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Toggle dropdown ────────────────────────────────────────────────────────
  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        fetchNotifications();
      }
      return next;
    });
  }, [fetchNotifications]);

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  // ── Close on Escape key ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // ── Mark single as read (optimistic) ───────────────────────────────────────
  async function handleMarkRead(notificationId: string) {
    const prev = notifications.find((n) => n.id === notificationId);
    if (!prev || prev.is_read) return;

    setNotifications((ns) =>
      ns.map((n) =>
        n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    const result = await markNotificationRead(notificationId);
    if (!result.success) {
      setNotifications((ns) =>
        ns.map((n) =>
          n.id === notificationId ? { ...n, is_read: false, read_at: null } : n
        )
      );
      setUnreadCount((c) => c + 1);
    }
  }

  // ── Mark all as read ───────────────────────────────────────────────────────
  async function handleMarkAllRead() {
    if (unreadCount === 0) return;

    const prevNotifs = notifications;
    const prevCount = unreadCount;

    setNotifications((ns) =>
      ns.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() }))
    );
    setUnreadCount(0);

    const result = await markAllNotificationsRead();
    if (!result.success) {
      setNotifications(prevNotifs);
      setUnreadCount(prevCount);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const displayBadge = Math.min(unreadCount, 99);

  return (
    <div ref={wrapperRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={toggleDropdown}
        className="relative min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors rounded-lg"
        aria-label={`Thông báo${unreadCount > 0 ? `, ${unreadCount} chưa đọc` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
            {displayBadge}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[28rem] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl z-10">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-serif font-bold text-gray-900">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                  {displayBadge}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <DropdownSkeleton />
          ) : error ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">Chưa có thông báo nào</p>
            </div>
          ) : (
            <ul role="list" className="divide-y divide-gray-100">
              {notifications.map((notif) => {
                const config = TYPE_CONFIG[notif.type as NotificationType] ?? TYPE_CONFIG.system;
                const IconComponent = config.iconComponent;

                return (
                  <li key={notif.id}>
                    <button
                      type="button"
                      onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                        notif.is_read ? "bg-white" : "bg-indigo-50 hover:bg-indigo-100"
                      }`}
                      aria-label={!notif.is_read ? `Đánh dấu đã đọc: ${notif.title}` : notif.title}
                    >
                      {/* Type icon */}
                      <div
                        className={`w-9 h-9 ${config.iconBg} rounded-full flex items-center justify-center shrink-0 mt-0.5`}
                        aria-hidden="true"
                      >
                        <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm truncate ${
                            notif.is_read ? "text-gray-700 font-medium" : "text-gray-900 font-semibold"
                          }`}
                        >
                          {notif.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{notif.message}</p>
                        <span className="text-xs text-gray-400 mt-1 block">
                          {getRelativeTime(notif.created_at)}
                        </span>
                      </div>

                      {/* Unread dot */}
                      {!notif.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" aria-label="Chưa đọc" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Footer */}
          <div className="border-t border-gray-100 sticky bottom-0 bg-white rounded-b-xl">
            <Link
              href="/profile/notifications"
              className="block text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium py-3 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Xem tất cả
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
