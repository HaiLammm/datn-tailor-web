"use client";

/**
 * CustomerNavbar — Story 15.1: Shared Boutique Mode top navigation.
 *
 * Replaces the inline navbar that lived in (customer)/layout.tsx. Renders the
 * real customer nav links (no more "Trang chủ → /showroom" loop) plus the
 * existing Cart / Notification / Profile / Logout cluster. Mobile uses a
 * hamburger drawer (Radix Dialog). userName is resolved server-side and passed
 * in as a prop (same pattern as ProfileIcon).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import { CartBadge } from "@/components/client/cart/CartBadge";
import { ProfileIcon } from "@/components/client/profile/ProfileIcon";
import { LogoutButton } from "@/components/client/profile/LogoutButton";
import { NotificationBell } from "@/components/client/profile/NotificationBell";

interface CustomerNavbarProps {
  userName?: string | null;
}

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Trang chủ" },
  { href: "/showroom", label: "Showroom" },
  { href: "/about", label: "Giới thiệu" },
  { href: "/blog", label: "Bài viết" },
  { href: "/contact", label: "Liên hệ" },
  { href: "/booking", label: "Đặt lịch" },
];

const focusRing =
  "rounded focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]";

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CustomerNavbar({ userName }: CustomerNavbarProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Brand logo → "/" (no longer /showroom) */}
          <Link
            href="/"
            className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${focusRing}`}
          >
            <span className="text-xl font-serif font-bold text-[#1A2B4C]">
              Nhà May Thanh Lộc
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden md:flex items-center gap-1"
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-2 min-h-[44px] flex items-center transition-colors ${focusRing} ${
                    active
                      ? "text-[#D4AF37] font-semibold border-b-2 border-[#D4AF37]"
                      : "text-gray-600 hover:text-[#1A2B4C]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Action cluster (reused components) */}
          <div className="flex items-center gap-2">
            <CartBadge />
            {userName && <NotificationBell />}
            <ProfileIcon userName={userName} />
            {userName && <LogoutButton />}

            {/* Mobile hamburger → drawer */}
            <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  aria-label="Mở menu"
                  className={`md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#1A2B4C] hover:text-[#D4AF37] transition-colors ${focusRing}`}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="md:hidden fixed inset-0 bg-black/40 z-40" />
                <Dialog.Content className="md:hidden fixed inset-y-0 right-0 z-50 w-72 max-w-[80vw] bg-white shadow-xl p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title className="text-lg font-serif font-bold text-[#1A2B4C]">
                      Menu
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Đóng menu"
                        className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-[#1A2B4C] transition-colors ${focusRing}`}
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </Dialog.Close>
                  </div>
                  <nav
                    aria-label="Menu di động"
                    className="flex flex-col gap-1"
                  >
                    {NAV_LINKS.map((link) => {
                      const active = isActive(pathname, link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setDrawerOpen(false)}
                          className={`px-3 py-2 min-h-[44px] flex items-center rounded transition-colors ${focusRing} ${
                            active
                              ? "text-[#D4AF37] font-semibold bg-[#1A2B4C]/5"
                              : "text-gray-700 hover:text-[#1A2B4C] hover:bg-gray-50"
                          }`}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </nav>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </div>
    </header>
  );
}
