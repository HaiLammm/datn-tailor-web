/**
 * SiteFooter — Story 15.1: Shared Boutique Mode footer.
 *
 * Replaces the per-page hardcoded showroom footers. Rendered once in the
 * (customer) layout so it appears on every customer-facing page.
 * Server Component — no interactivity, plain links only.
 */

import Link from "next/link";

import { SHOWROOM_ENABLED, STORE, telHref, zaloHref } from "@/lib/store-info";

const focusRing =
  "rounded focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]";

export function SiteFooter() {
  return (
    <footer className="bg-[#1A2B4C] text-[#F9F7F2] mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {/* Cột 1 — Về chúng tôi */}
          <section aria-labelledby="footer-about-heading">
            <h2
              id="footer-about-heading"
              className="text-xl font-serif font-semibold text-[#D4AF37] mb-4"
            >
              Về chúng tôi
            </h2>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className={`inline-flex items-center min-h-[44px] hover:text-[#D4AF37] transition-colors ${focusRing}`}
                >
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className={`inline-flex items-center min-h-[44px] hover:text-[#D4AF37] transition-colors ${focusRing}`}
                >
                  Câu chuyện thương hiệu
                </Link>
              </li>
            </ul>
          </section>

          {/* Cột 2 — Liên hệ */}
          <section aria-labelledby="footer-contact-heading">
            <h2
              id="footer-contact-heading"
              className="text-xl font-serif font-semibold text-[#D4AF37] mb-4"
            >
              Liên hệ
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="leading-relaxed">{STORE.address}</li>
              <li>
                <a
                  href={telHref(STORE.phone)}
                  className={`inline-flex items-center min-h-[44px] hover:text-[#D4AF37] transition-colors ${focusRing}`}
                >
                  ĐT: {STORE.phone}
                </a>
              </li>
              <li>
                <a
                  href={zaloHref(STORE.zalo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center min-h-[44px] hover:text-[#D4AF37] transition-colors ${focusRing}`}
                >
                  Zalo: {STORE.zalo}
                </a>
              </li>
              {STORE.email && (
                <li>
                  <a
                    href={`mailto:${STORE.email}`}
                    className={`inline-flex items-center min-h-[44px] hover:text-[#D4AF37] transition-colors ${focusRing}`}
                  >
                    {STORE.email}
                  </a>
                </li>
              )}
              <li className="leading-relaxed">{STORE.hours}</li>
            </ul>
          </section>

          {/* Cột 3 — Khám phá */}
          <section aria-labelledby="footer-explore-heading">
            <h2
              id="footer-explore-heading"
              className="text-xl font-serif font-semibold text-[#D4AF37] mb-4"
            >
              Khám phá
            </h2>
            <ul className="space-y-3">
              {SHOWROOM_ENABLED && (
                <li>
                  <Link
                    href="/showroom"
                    className={`inline-flex items-center min-h-[44px] hover:text-[#D4AF37] transition-colors ${focusRing}`}
                  >
                    Showroom
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href="/blog"
                  className={`inline-flex items-center min-h-[44px] hover:text-[#D4AF37] transition-colors ${focusRing}`}
                >
                  Cẩm nang
                </Link>
              </li>
              <li>
                <Link
                  href="/booking"
                  className={`inline-flex items-center min-h-[44px] hover:text-[#D4AF37] transition-colors ${focusRing}`}
                >
                  Đặt lịch
                </Link>
              </li>
            </ul>
          </section>
        </div>

        {/* Social + copyright */}
        <div className="mt-10 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#F9F7F2]/80">© 2026 {STORE.name}</p>
          <div className="flex items-center gap-2">
            <a
              href={STORE.facebook}
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-[#D4AF37] transition-colors ${focusRing}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898v-2.89h2.54V9.797c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </a>
            <a
              href={zaloHref(STORE.zalo)}
              aria-label="Zalo"
              target="_blank"
              rel="noopener noreferrer"
              className={`px-3 py-2 min-h-[44px] flex items-center justify-center text-sm font-semibold hover:text-[#D4AF37] transition-colors ${focusRing}`}
            >
              Zalo
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
