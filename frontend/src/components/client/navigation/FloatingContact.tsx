/**
 * FloatingContact — thanh Gọi / Zalo cố định đáy màn hình, chỉ trên điện thoại.
 *
 * Trước đây số điện thoại chỉ có ở footer (điện thoại phải cuộn ~7 màn hình mới
 * thấy). Thanh này giữ 2 cách liên hệ luôn trong khung nhìn ở mọi trang khách.
 * Server Component — chỉ có link.
 */

import { STORE, telHref, zaloHref } from "@/lib/store-info";

const focusRing =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#D4AF37]";

export function FloatingContact() {
  return (
    <div
      className="md:hidden fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-[#D4AF37]/40 bg-white shadow-[0_-4px_16px_rgba(26,43,76,0.12)] pb-[env(safe-area-inset-bottom)]"
      role="region"
      aria-label="Liên hệ nhanh"
    >
      <a
        href={telHref(STORE.phone)}
        className={`flex min-h-[56px] items-center justify-center gap-2 bg-[#1A2B4C] text-white font-semibold ${focusRing}`}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
        Gọi {STORE.phone}
      </a>
      <a
        href={zaloHref(STORE.zalo)}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex min-h-[56px] items-center justify-center gap-2 bg-[#0068FF] text-white font-semibold ${focusRing}`}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        Nhắn Zalo
      </a>
    </div>
  );
}
