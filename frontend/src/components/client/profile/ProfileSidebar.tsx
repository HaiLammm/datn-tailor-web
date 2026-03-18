"use client";

/**
 * ProfileSidebar - Story 4.4a: Customer Profile Layout + Navbar Icon
 * Sidebar navigation for profile pages. Handles active state via usePathname().
 * Desktop: vertical sidebar. Mobile: horizontal scrollable tab bar.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

interface ProfileSidebarProps {
  unreadNotificationCount?: number;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "Thông tin cá nhân",
    href: "/profile",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    label: "Đơn hàng",
    href: "/profile/orders",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    label: "Số đo",
    href: "/profile/measurements",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 7h3m13 0h-3M4 17h3m13 0h-3M4 12h3m13 0h-3" />
      </svg>
    ),
  },
  {
    label: "Lịch hẹn",
    href: "/profile/appointments",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Thông báo",
    href: "/profile/notifications",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    label: "Voucher",
    href: "/profile/vouchers",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
];

export function ProfileSidebar({ unreadNotificationCount = 0 }: ProfileSidebarProps) {
  const pathname = usePathname();
  const badgeCount = Math.min(unreadNotificationCount, 99);

  function renderLabel(item: NavItem) {
    if (item.href !== "/profile/notifications" || badgeCount === 0) {
      return <span>{item.label}</span>;
    }
    return (
      <>
        <span>{item.label}</span>
        <span
          className="ml-auto min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold leading-none"
          aria-label={`${badgeCount} thông báo chưa đọc`}
        >
          {badgeCount}
        </span>
      </>
    );
  }

  return (
    <>
      {/* Desktop sidebar (md+): vertical list */}
      <nav className="hidden md:flex flex-col w-56 shrink-0" aria-label="Điều hướng hồ sơ — Máy tính">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 rounded-r-lg rounded-l-none"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon}
                  {renderLabel(item)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile tab bar (<md): horizontal scrollable */}
      <nav className="md:hidden overflow-x-auto" aria-label="Điều hướng hồ sơ — Di động">
        <ul className="flex gap-1 pb-1 min-w-max">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    isActive
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon}
                  {renderLabel(item)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
