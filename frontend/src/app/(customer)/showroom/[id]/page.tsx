import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { fetchGarmentDetail } from "@/app/actions/garment-actions";
import { Breadcrumb } from "@/components/client/showroom/Breadcrumb";
import { ProductDetailClient } from "@/components/client/showroom/ProductDetailClient";
import { CATEGORY_LABEL } from "@/components/client/showroom/garmentConstants";
import { SITE_URL, garmentIdFromParam, garmentPath, jsonLdString } from "@/lib/seo";

/**
 * Story 2.2: Garment Detail Page — Image Gallery, Zoom, Size Chart, Buy/Rent Toggle
 * Refactored from Story 5.2 base.
 *
 * Server Component (async) — data fetched on server.
 * Route: /showroom/[id] — [id] là "<slug-tên>-<uuid>" (link cũ chỉ có uuid được 301 sang dạng này).
 * Next.js 16: params is a Promise, must be awaited.
 * Pattern: Server Component fetch → Client Component render (ProjectContext Rule 6)
 */

interface GarmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: GarmentDetailPageProps): Promise<Metadata> {
  const { id: param } = await params;
  const id = garmentIdFromParam(param);
  const garment = id ? await fetchGarmentDetail(id) : null;

  if (!garment) {
    return {
      title: "Không tìm thấy sản phẩm — Nhà May Thanh Lộc",
      robots: { index: false },
    };
  }

  const path = garmentPath(garment);
  const description =
    garment.description ??
    `${garment.name} — áo dài tại Nhà May Thanh Lộc, Buôn Ma Thuột. Xem ảnh, bảng size và đặt thuê hoặc mua.`;
  const image = garment.image_urls?.[0] ?? garment.image_url ?? undefined;

  return {
    title: `${garment.name} — Nhà May Thanh Lộc`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: garment.name,
      description,
      url: path,
      images: image ? [{ url: image, alt: garment.name }] : undefined,
    },
  };
}

export default async function GarmentDetailPage({
  params,
}: GarmentDetailPageProps) {
  const { id: param } = await params;
  const id = garmentIdFromParam(param);
  const garment = id ? await fetchGarmentDetail(id) : null;

  if (!garment) {
    notFound();
  }

  // Link cũ (/showroom/<uuid>) hoặc slug lệch tên hiện tại → 301 về đường dẫn chuẩn.
  const canonicalPath = garmentPath(garment);
  if (`/showroom/${decodeURIComponent(param)}` !== canonicalPath) {
    permanentRedirect(canonicalPath);
  }

  const images = (garment.image_urls?.length ? garment.image_urls : [garment.image_url]).filter(
    (u): u is string => Boolean(u),
  );
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: garment.name,
    description: garment.description ?? undefined,
    image: images.map((u) => (u.startsWith("http") ? u : `${SITE_URL}${u}`)),
    url: `${SITE_URL}${canonicalPath}`,
    category: CATEGORY_LABEL[garment.category] ?? garment.category,
    brand: { "@type": "Brand", name: "Nhà May Thanh Lộc" },
    ...(garment.sale_price
      ? {
          offers: {
            "@type": "Offer",
            price: Number(garment.sale_price),
            priceCurrency: "VND",
            availability:
              garment.status === "available"
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            seller: { "@id": `${SITE_URL}/#store` },
          },
        }
      : {}),
  };

  const categoryLabel = CATEGORY_LABEL[garment.category] ?? garment.category;

  const breadcrumbItems = [
    { label: "Showroom", href: "/showroom" },
    { label: categoryLabel, href: `/showroom?category=${garment.category}` },
    { label: garment.name },
  ];

  return (
    <div className="bg-[#F9F7F2]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(productJsonLd) }}
      />
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
    </div>
  );
}
