"use client";

/**
 * Story 2.2: ProductDetailClient — Client Component cho trang chi tiết sản phẩm
 *
 * - Nhận props từ Server Component (page.tsx)
 * - Render gallery, info, actions (client-side interactivity)
 * - 2-column layout: ảnh 60% / info 40% desktop; stacked mobile
 * - Không dùng Zustand (chỉ cần local state cho gallery index & buy/rent mode)
 */

import { Garment } from "@/types/garment";
import { StatusBadge } from "./StatusBadge";
import { ReturnTimeline } from "./ReturnTimeline";
import { ProductImageGallery } from "./ProductImageGallery";
import { SizeChartAccordion } from "./SizeChartAccordion";
import { BuyRentToggle } from "./BuyRentToggle";
import { CATEGORY_LABEL } from "./garmentConstants";

const OCCASION_LABEL: Record<string, string> = {
  le_cuoi: "Lễ Cưới",
  khai_truong: "Khai Trương",
  tet: "Tết",
  cong_so: "Công Sở",
  tiec_tung: "Tiệc Tùng",
  sinh_nhat: "Sinh Nhật",
};

interface ProductDetailClientProps {
  garment: Garment;
}

export function ProductDetailClient({ garment }: ProductDetailClientProps) {
  const categoryLabel = CATEGORY_LABEL[garment.category] ?? garment.category;
  const occasionLabel = garment.occasion ? (OCCASION_LABEL[garment.occasion] ?? garment.occasion) : null;
  const isAvailable = garment.status === "available";

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* 2-column responsive layout: ảnh 60% / info 40% desktop; stacked mobile */}
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 items-start">

          {/* === CỘT ẢNH === */}
          <section aria-label="Thư viện ảnh sản phẩm" className="relative">
            {/* Status Badge Overlay */}
            <div className="absolute top-3 right-3 z-10">
              <StatusBadge status={garment.status} />
            </div>
            <ProductImageGallery
              imageUrl={garment.image_url}
              imageUrls={garment.image_urls}
              productName={garment.name}
            />
          </section>

          {/* === CỘT THÔNG TIN === */}
          <section aria-label="Thông tin sản phẩm" className="flex flex-col gap-5">

            {/* Tên sản phẩm */}
            <h1
              className="text-2xl md:text-3xl font-semibold text-[#1A1A2E] leading-snug"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              {garment.name}
            </h1>

            {/* Return Timeline (Story 5.2 — tái dùng) */}
            <ReturnTimeline garment={garment} />

            {/* Buy/Rent Toggle + CTA */}
            <BuyRentToggle
              garment={garment}
              productName={garment.name}
              rentalPrice={garment.rental_price}
              salePrice={garment.sale_price}
              isAvailable={isAvailable}
              supportsBespoke={true}
            />

            {/* Mô tả */}
            {garment.description && (
              <div>
                <p
                  className="text-xs text-[#6B7280] uppercase tracking-wide mb-1"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Mô tả
                </p>
                <p
                  className="text-sm text-[#1A1A2E] leading-relaxed"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {garment.description}
                </p>
              </div>
            )}

            {/* Tags: Màu sắc & Dịp */}
            <div className="flex flex-wrap gap-2">
              {garment.color && (
                <span
                  className="text-xs px-3 py-1 bg-[#F9F7F2] text-[#1A1A2E] rounded-full border border-gray-200"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {garment.color}
                </span>
              )}
              <span
                className="text-xs px-3 py-1 rounded-full border border-[#1A2B4C]/20 text-[#1A2B4C] bg-[#1A2B4C]/5"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {categoryLabel}
              </span>
              {occasionLabel && (
                <span
                  className="text-xs px-3 py-1 rounded-full border border-amber-200"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400E", fontFamily: "Inter, sans-serif" }}
                >
                  {occasionLabel}
                </span>
              )}
            </div>

            {/* Kích cỡ có sẵn */}
            <div>
              <p
                className="text-xs text-[#6B7280] uppercase tracking-wide mb-2"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Kích cỡ có sẵn
              </p>
              <div className="flex flex-wrap gap-2" role="list" aria-label="Danh sách kích cỡ">
                {garment.size_options.map((size) => (
                  <span
                    key={size}
                    role="listitem"
                    className="inline-flex items-center justify-center w-10 h-10 text-sm font-medium border border-gray-300 rounded text-[#1A2B4C]"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>

            {/* Bảng Kích Cỡ Accordion */}
            <SizeChartAccordion availableSizes={garment.size_options} />
          </section>
        </div>
      </div>
    </main>
  );
}
