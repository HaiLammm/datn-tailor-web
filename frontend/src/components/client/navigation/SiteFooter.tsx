/**
 * SiteFooter — Story 15.1: Shared Boutique Mode footer.
 *
 * Replaces the per-page hardcoded showroom footers. Rendered once in the
 * (customer) layout so it appears on every customer-facing page.
 * Server Component — no interactivity, plain links only.
 */

import Link from "next/link";

import { STORE, telHref, zaloHref } from "@/lib/store-info";

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
              <li>
                <a
                  href={`mailto:${STORE.email}`}
                  className={`inline-flex items-center min-h-[44px] hover:text-[#D4AF37] transition-colors ${focusRing}`}
                >
                  {STORE.email}
                </a>
              </li>
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
              <li>
                <Link
                  href="/showroom"
                  className={`inline-flex items-center min-h-[44px] hover:text-[#D4AF37] transition-colors ${focusRing}`}
                >
                  Showroom
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
              href="https://facebook.com"
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
              href="https://instagram.com"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-[#D4AF37] transition-colors ${focusRing}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
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
