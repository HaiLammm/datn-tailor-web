/**
 * Customer Route Group Layout
 * Story 2.1: Lựa chọn Trụ cột Phong cách
 * Story 4.4a: Profile Icon added to navbar
 *
 * Layout for customer-facing design pages.
 */

import type { ReactNode } from "react";
import { auth } from "@/auth";
import { CartBadge } from "@/components/client/cart/CartBadge";
import { ProfileIcon } from "@/components/client/profile/ProfileIcon";

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
            <div className="flex items-center gap-2">
              <svg
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span className="text-xl font-serif font-bold text-indigo-900">
                Tailor Design
              </span>
            </div>
            <nav className="flex items-center gap-4">
              <a
                href="/"
                className="text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Trang chủ
              </a>
              <CartBadge />
              <ProfileIcon userName={userName} />
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
