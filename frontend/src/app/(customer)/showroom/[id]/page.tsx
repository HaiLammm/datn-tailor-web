import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchGarmentDetail } from "@/app/actions/garment-actions";
import { Breadcrumb } from "@/components/client/showroom/Breadcrumb";
import { ProductDetailClient } from "@/components/client/showroom/ProductDetailClient";
import { CATEGORY_LABEL } from "@/components/client/showroom/garmentConstants";

/**
 * Story 2.2: Garment Detail Page — Image Gallery, Zoom, Size Chart, Buy/Rent Toggle
 * Refactored from Story 5.2 base.
 *
 * Server Component (async) — data fetched on server.
 * Route: /showroom/[id]
 * Next.js 16: params is a Promise, must be awaited.
 * Pattern: Server Component fetch → Client Component render (ProjectContext Rule 6)
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
    description:
      garment.description ??
      `Chi tiết áo dài ${garment.name} tại Showroom Heritage Collection`,
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

  const categoryLabel = CATEGORY_LABEL[garment.category] ?? garment.category;

  const breadcrumbItems = [
    { label: "Showroom", href: "/showroom" },
    { label: categoryLabel, href: `/showroom?category=${garment.category}` },
    { label: garment.name },
  ];

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      {/* Header với Breadcrumb */}
      <header className="bg-[#1A2B4C] text-[#F9F7F2] py-6">
        <div className="container mx-auto px-4">
          <Breadcrumb items={breadcrumbItems} />
          <h1
            className="text-3xl font-bold mt-3"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            {garment.name}
          </h1>
        </div>
      </header>

      {/* Client Component xử lý toàn bộ tương tác */}
      <ProductDetailClient garment={garment} />

      {/* Footer */}
      <footer className="bg-[#1A2B4C] text-[#F9F7F2] py-6 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
            © 2026 Showroom Áo Dài - Heritage Collection
          </p>
        </div>
      </footer>
    </div>
  );
}
