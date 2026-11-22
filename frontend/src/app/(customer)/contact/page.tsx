import { Metadata } from "next";
import Image from "next/image";

import { HeroBanner } from "@/components/client/brand/HeroBanner";
import ContactForm from "@/components/client/brand/ContactForm";
import { STORE, STORE_MAP_EMBED_URL, telHref, zaloHref } from "@/lib/store-info";

/**
 * Contact page (`/contact`) — Story 15.4.
 * Split layout: store info + map (left) / ContactForm (right).
 * Server Component; the form is a client island. Shared navbar/footer come
 * from (customer)/layout.tsx — no page-level chrome here.
 */

export const metadata: Metadata = {
  title: "Liên hệ - Áo Dài Thanh Lộc",
  description:
    "Địa chỉ, số điện thoại, Zalo và giờ mở cửa của Áo Dài Thanh Lộc — 187B/1 Mai Hắc Đế, Buôn Ma Thuột, Đắk Lắk.",
  alternates: { canonical: "/contact" },
};

const CORMORANT = { fontFamily: "Cormorant Garamond, serif" } as const;
const focusRing =
  "rounded focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]";

export default function ContactPage() {
  return (
    <>
      <HeroBanner
        variant="showroom-compact"
        eyebrow="Liên hệ"
        title="Gặp gỡ & trò chuyện cùng chúng tôi"
        subline="Hẹn một buổi trò chuyện, hay chỉ đơn giản là nhắn cho chúng tôi đôi dòng — chúng tôi luôn sẵn lòng."
      />

      <section className="bg-[#F9F7F2] py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid items-start gap-10 md:grid-cols-2 lg:gap-16">
            {/* Info side */}
            <div className="space-y-8">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-sm">
                <Image
                  src="/shop/storefront.jpg"
                  alt={`Mặt tiền ${STORE.name}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div>
                <h2
                  className="text-2xl font-serif font-semibold text-[#1A2B4C]"
                  style={CORMORANT}
                >
                  Ghé tiệm
                </h2>
                <p className="mt-2 leading-relaxed text-[#6B7280]">{STORE.address}</p>
                <div className="mt-4 overflow-hidden rounded-xl border border-[#E5E1D8]">
                  <iframe
                    title="Bản đồ tới Áo Dài Thanh Lộc"
                    src={STORE_MAP_EMBED_URL}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="aspect-[4/3] w-full"
                  />
                </div>
              </div>

              <div>
                <h2
                  className="text-2xl font-serif font-semibold text-[#1A2B4C]"
                  style={CORMORANT}
                >
                  Giờ mở cửa
                </h2>
                <p className="mt-2 text-[#6B7280]">{STORE.hours}</p>
              </div>

              <div>
                <h2
                  className="text-2xl font-serif font-semibold text-[#1A2B4C]"
                  style={CORMORANT}
                >
                  Gọi / nhắn cho chúng tôi
                </h2>
                <ul className="mt-3 space-y-2 text-[#1A2B4C]">
                  <li>
                    <a
                      href={telHref(STORE.phone)}
                      className={`inline-flex min-h-[44px] items-center font-medium hover:text-[#D4AF37] transition-colors ${focusRing}`}
                    >
                      Điện thoại: {STORE.phone}
                    </a>
                  </li>
                  <li>
                    <a
                      href={zaloHref(STORE.zalo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex min-h-[44px] items-center font-medium hover:text-[#D4AF37] transition-colors ${focusRing}`}
                    >
                      Zalo: {STORE.zalo}
                    </a>
                  </li>
                  {STORE.email && (
                    <li>
                      <a
                        href={`mailto:${STORE.email}`}
                        className={`inline-flex min-h-[44px] items-center font-medium hover:text-[#D4AF37] transition-colors ${focusRing}`}
                      >
                        Email: {STORE.email}
                      </a>
                    </li>
                  )}
                </ul>
                <div className="mt-4 flex items-center gap-2">
                  <a
                    href={STORE.facebook}
                    aria-label="Facebook"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex min-h-[44px] min-w-[44px] items-center justify-center text-[#1A2B4C] hover:text-[#D4AF37] transition-colors ${focusRing}`}
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898v-2.89h2.54V9.797c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Form side */}
            <div className="rounded-2xl border border-[#E5E1D8] bg-white p-6 shadow-sm md:p-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
