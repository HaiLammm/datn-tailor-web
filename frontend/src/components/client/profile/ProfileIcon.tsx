"use client";

/**
 * ProfileIcon - Story 4.4a: Customer Profile Layout + Navbar Icon
 * Profile icon for customer navbar. Session data passed from Server Component parent.
 * Pattern: follows CartBadge.tsx — "use client" + SVG icon + router.push()
 */

import { useRouter } from "next/navigation";

interface ProfileIconProps {
  userName?: string | null;
}

export function ProfileIcon({ userName }: ProfileIconProps) {
  const router = useRouter();

  if (userName == null) {
    return (
      <button
        onClick={() => router.push("/login")}
        className="px-3 py-2 text-sm font-medium text-[#1A2B4C] hover:text-[#D4AF37] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        Đăng nhập
      </button>
    );
  }

  return (
    <button
      onClick={() => router.push("/profile")}
      aria-label="Hồ sơ cá nhân"
      className="relative p-2 text-[#1A2B4C] hover:text-[#D4AF37] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
    >
      {/* User profile icon */}
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
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    </button>
  );
}
