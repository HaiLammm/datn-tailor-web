/**
 * Customer Route Group Layout
 * Story 2.1: Lựa chọn Phong cách
 * Story 4.4a: Profile Icon added to navbar
 *
 * Layout for customer-facing design pages.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { CartBadge } from "@/components/client/cart/CartBadge";
import { ProfileIcon } from "@/components/client/profile/ProfileIcon";
import { LogoutButton } from "@/components/client/profile/LogoutButton";
import { NotificationBell } from "@/components/client/profile/NotificationBell";

interface CustomerLayoutProps {
  children: ReactNode;
}

export default async function CustomerLayout({ children }: CustomerLayoutProps) {
  const session = await auth();
  const userName = session?.user?.name ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation header placeholder */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/showroom" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-xl font-serif font-bold text-indigo-900">
                Tailor Design
              </span>
            </Link>
            <nav className="flex items-center gap-4">
              <a
                href="/"
                className="text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Trang chủ
              </a>
              <CartBadge />
              {userName && <NotificationBell />}
              <ProfileIcon userName={userName} />
              {userName && <LogoutButton />}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
