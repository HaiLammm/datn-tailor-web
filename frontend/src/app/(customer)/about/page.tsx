import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { HeroBanner } from "@/components/client/brand/HeroBanner";
import { FeatureTriad, type FeatureItem } from "@/components/client/brand/FeatureTriad";
import { TestimonialStrip, type TestimonialItem } from "@/components/client/brand/TestimonialStrip";

/**
 * Story 15.3: About page — editorial Brand CV (4 pillars + closing CTA).
 * Static SSG, Boutique Mode. Shared navbar/footer come from (customer)/layout.tsx.
 */

export const metadata: Metadata = {
  title: "Giới thiệu - Nhà May Thanh Lộc",
  description:
    "Câu chuyện thương hiệu, nghề thủ công và lời cảm nhận của khách hàng tại Nhà May Thanh Lộc.",
};

const CORMORANT = { fontFamily: "Cormorant Garamond, serif" } as const;

const PROCESS_STEPS: { title: string; description: string }[] = [
  { title: "Tư vấn", description: "Lắng nghe phong cách và mong muốn của bạn." },
  { title: "Đo", description: "Số đo cá nhân hoá, lưu vào hồ sơ riêng." },
  { title: "Lên mẫu", description: "Tạo mẫu áo chính xác theo số đo của bạn." },
  { title: "May tay", description: "Thợ may lành nghề chăm chút từng đường kim." },
  { title: "Vừa lần đầu", description: "Vừa vặn ngay lần thử đầu tiên." },
];

const GALLERY: { src: string; alt: string }[] = [
  { src: "/shop/storefront.jpg", alt: "Mặt tiền tiệm Áo Dài Thanh Lộc" },
  { src: "/shop/display-embroidered.jpg", alt: "Áo dài thêu hạc, phượng rực rỡ trưng bày tại tiệm" },
  { src: "/shop/window-display.jpg", alt: "Tủ kính trưng bày áo dài đủ sắc màu" },
  { src: "/shop/wedding-couple.jpg", alt: "Bộ áo dài cưới đỏ thêu chữ song hỷ cho cô dâu chú rể" },
  { src: "/shop/white-rack.jpg", alt: "Những tà áo dài trắng vừa may xong trên sào" },
  { src: "/shop/hanging-fabrics.jpg", alt: "Những tà áo dài xanh, kem treo tại tiệm" },
];

const FEATURES: FeatureItem[] = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    title: "Yêu ngay lần thử đầu",
    description:
      "Hơn 9 trên 10 người vừa in ngay lần đầu — đỡ mất công đi lại, chỉ còn lại niềm vui trọn vẹn.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: "Riêng một mình bạn",
    description:
      "Từ dáng hình đến sở thích, bạn được cùng chúng tôi chọn từng chi tiết — để tà áo thật sự là của bạn.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: "Nâng niu đến từng chút",
    description:
      "Lụa, gấm tuyển chọn cùng lời tư vấn dành riêng cho bạn — chu đáo, ấm áp từ đầu đến cuối.",
  },
];

const TESTIMONIALS: TestimonialItem[] = [
  {
    quote: "Tà áo như được sinh ra cho riêng mình vậy.",
    name: "Chị Phương",
    context: "Khách may áo riêng",
    avatarInitial: "P",
  },
  {
    quote: "Người thợ tận tâm, từng bước đều chỉn chu, tà áo nhận về còn đẹp hơn mình mơ.",
    name: "Chị Trang",
    context: "Áo dài cưới",
    avatarInitial: "T",
  },
  {
    quote: "Hiện đại mà vẫn ấm cái tình xưa — tà áo có hồn, có cả câu chuyện.",
    name: "Chị Ngọc",
    context: "Áo dài Tết",
    avatarInitial: "N",
  },
];

const ctaPrimary =
  "inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-full bg-[#D4AF37] text-[#1A2B4C] font-semibold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]";
const ctaOutline =
  "inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-full border-2 border-[#F9F7F2] text-[#F9F7F2] font-semibold hover:bg-[#F9F7F2]/10 transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]";

export default function AboutPage() {
  return (
    <div className="bg-[#F9F7F2]">
      {/* Hero — Pillar 1 entry */}
      <HeroBanner
        variant="about"
        eyebrow="Về chúng tôi"
        title={
          <>
            Giữ hồn áo dài,
            <br />
            qua bao mùa thương.
          </>
        }
        subline="Một tiệm may nặng lòng với áo dài — nơi mỗi tà áo lớn lên từ đôi tay người thợ và sự nâng niu trong từng số đo."
      />

      {/* Pillar 1 — Brand story */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37] mb-3">
                Điều chúng tôi tin
              </span>
              <h2
                className="text-3xl md:text-4xl font-serif font-semibold text-[#1A2B4C] mb-5"
                style={CORMORANT}
              >
                Khởi đầu từ một điều giản dị.
              </h2>
              <p className="text-[#6B7280] text-base leading-relaxed mb-4">
                Chúng tôi tin mỗi người phụ nữ Việt xứng đáng có một tà áo của riêng mình — vừa vóc
                dáng, vừa nết duyên, chứ không phải một chiếc áo may sẵn giống hệt trăm người.
              </p>
              <p className="text-[#6B7280] text-base leading-relaxed">
                Vì lẽ đó, chúng tôi vừa giữ lấy nghề may thủ công của cha ông, vừa đo may thật tỉ mỉ
                — để cái hồn xưa vẫn còn, mà tà áo thì vừa in từng đường nét.
              </p>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-lg">
              <Image
                src="/shop/interior-colorful.jpg"
                alt="Không gian tiệm Nhà May Thanh Lộc với những tà áo dài đủ sắc màu"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pillar 2 — Craft & process timeline */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37] mb-2">
              Quy trình
            </span>
            <h2
              className="text-3xl md:text-4xl font-serif font-semibold text-[#1A2B4C]"
              style={CORMORANT}
            >
              Từ cảm hứng đến tà áo hoàn thiện
            </h2>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-4">
            {PROCESS_STEPS.map((step, i) => (
              <li key={`${step.title}-${i}`} className="relative text-center px-3">
                {/* Connector (desktop only, between steps) */}
                {i < PROCESS_STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="hidden md:block absolute top-6 left-[60%] w-[80%] h-0.5 bg-[repeating-linear-gradient(90deg,#D4AF37_0_6px,transparent_6px_12px)]"
                  />
                )}
                <span className="relative z-10 mx-auto mb-4 w-12 h-12 rounded-full bg-[#1A2B4C] text-[#D4AF37] font-medium grid place-items-center">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-xl font-serif font-semibold text-[#1A2B4C] mb-1.5" style={CORMORANT}>
                  {step.title}
                </h3>
                <p className="text-sm text-[#6B7280]">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pillar 3 — Why-Choose-Us */}
      <section className="py-20">
        <FeatureTriad
          eyebrow="Vì sao khách thương"
          heading="Điều khiến bạn muốn quay lại"
          items={FEATURES}
        />
      </section>

      {/* Pillar 4 — Testimonials */}
      <section className="py-20 bg-white">
        <TestimonialStrip
          eyebrow="Khách thương"
          heading="Được hàng trăm khách thương gửi trọn niềm tin"
          items={TESTIMONIALS}
        />
      </section>

      {/* Pillar 5 — Cửa tiệm & sản phẩm (gallery) */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37] mb-2">
              Ghé thăm
            </span>
            <h2
              className="text-3xl md:text-4xl font-serif font-semibold text-[#1A2B4C]"
              style={CORMORANT}
            >
              Không gian tiệm & những tà áo
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {GALLERY.map((g) => (
              <div
                key={g.src}
                className="relative aspect-square overflow-hidden rounded-xl shadow-sm"
              >
                <Image
                  src={g.src}
                  alt={g.alt}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA band */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1A2B4C] to-[#0f1b33] text-[#F9F7F2] text-center py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(212,175,55,0.22),transparent_60%)]"
        />
        <div className="relative container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-serif font-semibold mb-4" style={CORMORANT}>
            Hãy để chúng tôi kể câu chuyện của bạn, bằng một tà áo.
          </h2>
          <p className="text-[#F9F7F2]/80 mb-8 max-w-xl mx-auto">
            Hẹn một buổi trò chuyện, hay chỉ đơn giản là nhắn cho chúng tôi đôi dòng.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/booking" className={ctaPrimary}>
              Đặt lịch tư vấn
            </Link>
            <Link href="/contact" className={ctaOutline}>
              Liên hệ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
