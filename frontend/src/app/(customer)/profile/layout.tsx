/**
 * Profile Layout - Story 4.4a: Customer Profile Layout + Navbar Icon
 * Server Component layout for all /profile/* routes.
 * Auth guard: redirects to /login if not authenticated.
 * Contains ProfileSidebar (Client Component) for navigation.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProfileSidebar } from "@/components/client/profile/ProfileSidebar";
import { getUnreadNotificationCount } from "@/app/actions/profile-actions";

interface ProfileLayoutProps {
  children: ReactNode;
}

export default async function ProfileLayout({ children }: ProfileLayoutProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const userName = session.user?.name ?? session.user?.id ?? "Khách hàng";

  const unreadResult = await getUnreadNotificationCount();
  const unreadCount = unreadResult.success ? (unreadResult.data?.unread_count ?? 0) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-1" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-indigo-600 transition-colors">
                  Trang chủ
                </Link>
              </li>
              <li aria-hidden="true">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </li>
              <li className="text-gray-900 font-medium">Hồ sơ</li>
            </ol>
          </nav>
          {/* User greeting */}
          <h1 className="text-xl font-serif font-bold text-indigo-900">
            Xin chào, <span className="text-indigo-600">{userName}</span>
          </h1>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="bg-white border-b border-gray-200 md:hidden">
        <div className="max-w-7xl mx-auto px-4">
          <ProfileSidebar unreadNotificationCount={unreadCount} />
        </div>
      </div>

      {/* Main content: sidebar (desktop) + content area */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-6">
              <ProfileSidebar unreadNotificationCount={unreadCount} />
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
