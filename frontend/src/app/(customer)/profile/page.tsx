/**
 * Profile Default Page - Story 4.4a: Customer Profile Layout + Navbar Icon
 * Default landing page for /profile route.
 * Auth guard is handled by layout.tsx (parent).
 * Placeholder content — Story 4.4b will implement full personal info.
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="text-center py-12">
        <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-3">
          Thông tin cá nhân
        </h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Sắp ra mắt — chức năng quản lý thông tin cá nhân và bảo mật đang được
          phát triển.
        </p>
      </div>
    </div>
  );
}
