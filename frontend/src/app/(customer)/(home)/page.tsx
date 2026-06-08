import { Metadata } from "next";
import Link from "next/link";

import { HeroBanner } from "@/components/client/brand/HeroBanner";
import { FeatureTriad, type FeatureItem } from "@/components/client/brand/FeatureTriad";
import {
  TestimonialStrip,
  type TestimonialItem,
} from "@/components/client/brand/TestimonialStrip";
import { RevealOnScroll } from "@/components/client/brand/RevealOnScroll";
import { GarmentCard } from "@/components/client/showroom/GarmentCard";
import { fetchGarments } from "@/app/actions/garment-actions";
import { GarmentStatus } from "@/types/garment";

/**
 * Story 15.5: Homepage Landing "CV" — the boutique's persuasive front door.
 * Replaces the old redirect("/showroom"). Lives in the (customer) route group
 * so it inherits the shared CustomerNavbar + SiteFooter + Boutique Mode chrome.
 * Server Component: fetches featured garments (public, ISR) at request/build time.
 */

export const metadata: Metadata = {
  title: "Nhà May Thanh Lộc — May áo dài riêng, giữ trọn nét Việt",
  description:
    "Áo dài may riêng vừa vặn từng dáng người. Khám phá bộ sưu tập, nghe câu chuyện nghề và hẹn một buổi trò chuyện cùng chúng tôi.",
};

const CORMORANT = { fontFamily: "Cormorant Garamond, serif" } as const;

const ctaPrimary =
  "inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-full bg-[#D4AF37] text-[#1A2B4C] font-semibold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]";
const ctaOutline =
  "inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-full border-2 border-[#F9F7F2] text-[#F9F7F2] font-semibold hover:bg-[#F9F7F2]/10 transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]";
const linkDark =
  "inline-flex items-center gap-1 min-h-[44px] font-semibold text-[#1A2B4C] hover:text-[#D4AF37] transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]";

const FEATURES: FeatureItem[] = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    title: "Yêu ngay lần thử đầu",
    description:
      "Vừa vặn cả dáng hình lẫn nét duyên ngay lần đầu khoác lên — chẳng phải sửa tới sửa lui, chẳng phải chờ mong.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: "Đường kim có hồn",
    description:
      "Mỗi mũi chỉ là một chút tâm tình người thợ gửi vào — để hồn áo dài Việt sống mãi trong từng tà áo.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    title: "Riêng một mình bạn",
    description:
      "Đồng điệu từ dáng hình đến tâm hồn — để bạn yêu tà áo ngay từ cái nhìn đầu tiên.",
  },
];

const TESTIMONIALS: TestimonialItem[] = [
  {
    quote:
      "Lần đầu đặt áo dài trên mạng mà vừa in như may sẵn cho mình, chẳng phải sửa một chỗ nào.",
    name: "Chị Linh",
    context: "Quận 1, TP.HCM",
    avatarInitial: "L",
  },
  {
    quote:
      "Đẹp và sang, bước vào như lạc giữa một tiệm may riêng, ấm áp chứ không lạnh lùng kiểu mua bán.",
    name: "Chị Hương",
    context: "Hà Nội",
    avatarInitial: "H",
  },
  {
    quote:
      "Hẹn xong ghé tiệm, mọi thứ đã chờ sẵn. Cảm giác được nâng niu, chu đáo đến từng chút.",
    name: "Chị Mai",
    context: "Đà Nẵng",
    avatarInitial: "M",
  },
];

export default async function HomePage() {
  // Featured = newest available garments (no curation field exists in the model).
  const res = await fetchGarments({ status: GarmentStatus.AVAILABLE, page_size: 4 });
  const featured = Array.isArray(res?.data?.items) ? res.data.items : [];

  return (
    <div className="bg-[#F9F7F2]">
      {/* Section 1 — Full-bleed hero */}
      <HeroBanner
        variant="home"
        eyebrow="Áo dài may riêng · Giữ trọn nét Việt"
        title={
          <>
            Một tà áo,
            <br />
            vẹn cả dáng hình.
          </>
        }
        subline="Nơi mỗi đường kim kể một câu chuyện riêng — để tà áo không chỉ ôm trọn dáng người, mà còn chạm khẽ vào lòng bạn ngay từ cái nhìn đầu tiên."
      >
        <Link href="/showroom" className={ctaPrimary}>
          Dạo xem bộ sưu tập
        </Link>
        <Link href="/booking" className={ctaOutline}>
          Hẹn một buổi trò chuyện
        </Link>
      </HeroBanner>

      {/* Section 2 — Why-Choose-Us */}
      <section className="py-20">
        <RevealOnScroll>
          <FeatureTriad
            eyebrow="Lời chúng tôi gửi bạn"
            heading="Vì sao chọn chúng tôi"
            items={FEATURES}
          />
        </RevealOnScroll>
      </section>

      {/* Section 3 — Featured Collection (graceful fallback: hidden when empty) */}
      {featured.length > 0 && (
        <section className="py-20 bg-white">
          <RevealOnScroll>
            <div className="container mx-auto px-4">
              <div className="flex items-end justify-between flex-wrap gap-3 mb-10">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37] mb-2">
                    Tuyển chọn
                  </span>
                  <h2
                    className="text-3xl md:text-4xl font-serif font-semibold text-[#1A2B4C]"
                    style={CORMORANT}
                  >
                    Bộ sưu tập nổi bật
                  </h2>
                </div>
                <Link href="/showroom" className={linkDark}>
                  Xem tất cả →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featured.map((garment) => (
                  <GarmentCard key={garment.id} garment={garment} />
                ))}
              </div>
            </div>
          </RevealOnScroll>
        </section>
      )}

      {/* Section 4 — Brand story teaser */}
      <section className="py-20">
        <RevealOnScroll>
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37] mb-3">
                  Câu chuyện của chúng tôi
                </span>
                <h2
                  className="text-3xl md:text-4xl font-serif font-semibold text-[#1A2B4C] mb-5"
                  style={CORMORANT}
                >
                  Hơn một tà áo —
                  <br />
                  là cả một tấm lòng.
                </h2>
                <p className="text-[#6B7280] text-base leading-relaxed mb-4">
                  Từ một tiệm may nhỏ, chúng tôi lớn lên cùng tình yêu dành cho áo dài Việt — mong
                  giữ lại nét duyên ấy cho mọi người, qua bao mùa.
                </p>
                <p className="text-[#6B7280] text-base leading-relaxed mb-6">
                  Không vội vàng, không đại trà. Chỉ có những tà áo được may bằng cả sự nâng niu, cho
                  riêng một người.
                </p>
                <Link href="/about" className={linkDark}>
                  Nghe trọn câu chuyện →
                </Link>
              </div>
              <div
                aria-hidden="true"
                className="aspect-[4/5] rounded-2xl bg-[radial-gradient(120%_90%_at_30%_0%,rgba(212,175,55,0.22),transparent_55%),linear-gradient(140deg,#22335a,#1A2B4C_45%,#101b33)]"
              />
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* Section 5 — Testimonials */}
      <section className="py-20 bg-white">
        <RevealOnScroll>
          <TestimonialStrip
            eyebrow="Lời thương từ khách"
            heading="Niềm tin được dệt nên"
            items={TESTIMONIALS}
          />
        </RevealOnScroll>
      </section>

      {/* Section 6 — Closing CTA band */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1A2B4C] to-[#0f1b33] text-[#F9F7F2] text-center py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(212,175,55,0.22),transparent_60%)]"
        />
        <div className="relative container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-serif font-semibold mb-4" style={CORMORANT}>
            Tà áo của riêng bạn đang chờ được may.
          </h2>
          <p className="text-[#F9F7F2]/80 mb-8 max-w-xl mx-auto">
            Hẹn một buổi trò chuyện cùng chúng tôi, hoặc thong thả dạo xem bộ sưu tập ngay hôm nay.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/booking" className={ctaPrimary}>
              Hẹn một buổi trò chuyện
            </Link>
            <Link href="/showroom" className={ctaOutline}>
              Dạo xem bộ sưu tập
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
