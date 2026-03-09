import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { fetchGarmentDetail } from "@/app/actions/garment-actions";
import { StatusBadge } from "@/components/client/showroom/StatusBadge";
import { ReturnTimeline } from "@/components/client/showroom/ReturnTimeline";

/**
 * Story 5.2: Garment Detail Page — Return Timeline & Status
 * Server Component (async) — data fetched on server.
 * Route: /showroom/[id]
 * Next.js 16: params is a Promise, must be awaited.
 */

interface GarmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: GarmentDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const garment = await fetchGarmentDetail(id);

  if (!garment) {
    return {
      title: "Không tìm thấy sản phẩm - Showroom Áo Dài",
    };
  }

  return {
    title: `${garment.name} - Showroom Áo Dài`,
    description: garment.description ?? `Chi tiết áo dài ${garment.name} tại Showroom Heritage Collection`,
  };
}

export default async function GarmentDetailPage({
  params,
}: GarmentDetailPageProps) {
  const { id } = await params;
  const garment = await fetchGarmentDetail(id);

  if (!garment) {
    notFound();
  }

  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(parseFloat(garment.rental_price));

  const occasionLabel = garment.occasion
    ? garment.occasion.replace(/_/g, " ")
    : null;

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      {/* Header */}
      <header className="bg-[#1A2B4C] text-[#F9F7F2] py-6">
        <div className="container mx-auto px-4">
          <Link
            href="/showroom"
            className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#F9F7F2] transition-colors text-sm mb-3"
            aria-label="Quay lại Showroom"
          >
            ← Quay lại Showroom
          </Link>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            {garment.name}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="relative h-96 md:h-full min-h-[384px] bg-gray-100 rounded-lg overflow-hidden">
            {garment.image_url ? (
              <Image
                src={garment.image_url}
                alt={garment.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#F9F7F2]">
                <span className="text-gray-400 text-sm">Chưa có hình ảnh</span>
              </div>
            )}
            {/* Status Badge Overlay */}
            <div className="absolute top-3 right-3">
              <StatusBadge status={garment.status} />
            </div>
          </div>

          {/* Details Section */}
          <div className="flex flex-col gap-6">
            {/* Price */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Giá thuê
              </p>
              <p
                className="text-3xl font-bold"
                style={{ color: "#D4AF37" }}
              >
                {priceFormatted}
              </p>
            </div>

            {/* Return Timeline (Story 5.2) */}
            <ReturnTimeline garment={garment} />

            {/* Description */}
            {garment.description && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Mô tả
                </p>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {garment.description}
                </p>
              </div>
            )}

            {/* Tags Row */}
            <div className="flex flex-wrap gap-2">
              {garment.color && (
                <span className="text-xs px-3 py-1 bg-[#F9F7F2] text-gray-700 rounded-full border border-gray-200">
                  {garment.color}
                </span>
              )}
              {occasionLabel && (
                <span
                  className="text-xs px-3 py-1 rounded-full border border-amber-200"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                >
                  {occasionLabel}
                </span>
              )}
            </div>

            {/* Sizes */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Kích cỡ có sẵn
              </p>
              <div className="flex flex-wrap gap-2">
                {garment.size_options.map((size) => (
                  <span
                    key={size}
                    className="inline-flex items-center justify-center w-10 h-10 text-sm font-medium border border-gray-300 rounded text-[#1A2B4C]"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1A2B4C] text-[#F9F7F2] py-6 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">© 2026 Showroom Áo Dài - Heritage Collection</p>
        </div>
      </footer>
    </div>
  );
}
