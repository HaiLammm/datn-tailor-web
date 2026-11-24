import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { HeroBanner } from "@/components/client/brand/HeroBanner";
import { FeatureTriad, type FeatureItem } from "@/components/client/brand/FeatureTriad";
import {
  TestimonialStrip,
  type TestimonialItem,
} from "@/components/client/brand/TestimonialStrip";
import { RevealOnScroll } from "@/components/client/brand/RevealOnScroll";
import { GarmentCard } from "@/components/client/showroom/GarmentCard";
import { BlogCard } from "@/components/client/blog/BlogCard";
import { fetchGarments } from "@/app/actions/garment-actions";
import { GarmentStatus } from "@/types/garment";
import { getAllPosts } from "@/lib/blog";
import { jsonLdString, storeJsonLd } from "@/lib/seo";
import { SHOWROOM_ENABLED, STORE, TESTIMONIALS_ENABLED, zaloHref } from "@/lib/store-info";

/**
 * Story 15.5: Homepage Landing "CV" — the boutique's persuasive front door.
 * Replaces the old redirect("/showroom"). Lives in the (customer) route group
 * so it inherits the shared CustomerNavbar + SiteFooter + Boutique Mode chrome.
 * Server Component: fetches featured garments (public, ISR) at request/build time.
 */

export const metadata: Metadata = {
  title: "Áo Dài Thanh Lộc — May áo dài riêng, giữ trọn nét Việt",
  description:
    "Áo dài may riêng vừa vặn từng dáng người. Khám phá bộ sưu tập, nghe câu chuyện nghề và hẹn một buổi trò chuyện cùng chúng tôi.",
  alternates: { canonical: "/" },
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
    title: "Yêu ngay lần thử đầu",
    description:
      "Thợ đo trực tiếp tại tiệm và may theo đúng số đo của bạn, để áo vừa ngay lần thử đầu, đỡ phải sửa đi sửa lại.",
  },
  {
    title: "May tay từng chiếc",
    description:
      "Thợ trong tiệm tự cắt và may từng chiếc áo theo số đo riêng, không may hàng loạt.",
  },
  {
    title: "Chọn vải và kiểu cùng thợ",
    description:
      "Bạn cùng thợ chọn vải, màu và kiểu áo hợp với dáng người và dịp mặc, để chiếc áo là của riêng bạn.",
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
  const res = SHOWROOM_ENABLED
    ? await fetchGarments({ status: GarmentStatus.AVAILABLE, page_size: 4 })
    : null;
  const featured = Array.isArray(res?.data?.items) ? res.data.items : [];

  // Latest blog posts (file-based, read at build time); section hidden when empty.
  const latestPosts = getAllPosts().slice(0, 3);

  return (
    <div className="bg-[#F9F7F2]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(storeJsonLd()) }}
      />
      {/* Section 1 — Full-bleed hero */}
      <HeroBanner
        variant="home"
        imageSrc="/shop/interior-wide.jpg"
        title="Nhà may Thanh Lộc may đo, bán và cho thuê áo dài ở Buôn Ma Thuột."
        subline="Ghé tiệm ở 187B/1 Mai Hắc Đế để chọn vải và đo, hoặc nhắn Zalo gửi mẫu bạn thích để tiệm báo giá."
      >
        {/* Showroom online chưa có hàng → nút chính là liên hệ trực tiếp */}
        <a
          href={zaloHref(STORE.zalo)}
          target="_blank"
          rel="noopener noreferrer"
          className={ctaPrimary}
        >
          Nhắn Zalo cho tiệm
        </a>
        <Link href="/booking" className={ctaOutline}>
          Đặt lịch đo may
        </Link>
      </HeroBanner>

      {/* Section 2 — Why-Choose-Us */}
      <section className="py-20">
        <RevealOnScroll>
          <FeatureTriad
            heading="Vì sao lại chọn chúng tôi?"
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
                <h2
                  className="text-3xl md:text-4xl font-serif font-semibold text-[#1A2B4C] mb-5"
                  style={CORMORANT}
                >
                  Thanh Lộc bắt đầu từ một tiệm may nhỏ ở Buôn Ma Thuột.
                </h2>
                <p className="text-[#6B7280] text-base leading-relaxed mb-4">
                  Tiệm mở từ năm 1999. Cô Thanh Lộc là thợ chính, đến nay vẫn tự tay đo và may áo
                  cho khách.
                </p>
                <p className="text-[#6B7280] text-base leading-relaxed mb-6">
                  Mỗi chiếc áo được may theo số đo của một người, không may sẵn hàng loạt.
                </p>
                <Link href="/about" className={linkDark}>
                  Xem thêm về tiệm →
                </Link>
              </div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-lg">
                <Image
                  src="/shop/handwork.jpg"
                  alt="Bàn tay người thợ tỉ mỉ đính từng cánh hoa vải lên tà áo dài"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* Section 5 — Testimonials (ẩn tới khi có lời khách thật, xem TESTIMONIALS_ENABLED) */}
      {TESTIMONIALS_ENABLED && (
        <section className="py-20 bg-white">
          <RevealOnScroll>
            <TestimonialStrip
              heading="Khách nói gì sau khi may áo ở tiệm?"
              items={TESTIMONIALS}
            />
          </RevealOnScroll>
        </section>
      )}

      {/* Section 5.5 — Latest journal posts (hidden when empty) */}
      {latestPosts.length > 0 && (
        <section className="py-20">
          <RevealOnScroll>
            <div className="container mx-auto px-4">
              <div className="flex items-end justify-between flex-wrap gap-3 mb-10">
                <div>
                  <h2
                    className="text-3xl md:text-4xl font-serif font-semibold text-[#1A2B4C]"
                    style={CORMORANT}
                  >
                    Chuyện tà áo dài
                  </h2>
                </div>
                <Link href="/blog" className={linkDark}>
                  Xem tất cả →
                </Link>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestPosts.map((post) => (
                  <li key={post.slug} className="h-full">
                    <BlogCard post={post} />
                  </li>
                ))}
              </ul>
            </div>
          </RevealOnScroll>
        </section>
      )}

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
            Nhắn Zalo để xem mẫu và hỏi giá, hoặc đặt lịch ghé tiệm đo may.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={zaloHref(STORE.zalo)}
              target="_blank"
              rel="noopener noreferrer"
              className={ctaPrimary}
            >
              Nhắn Zalo cho tiệm
            </a>
            <Link href="/booking" className={ctaOutline}>
              Đặt lịch đo may
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
