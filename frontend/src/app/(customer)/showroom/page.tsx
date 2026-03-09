import { Metadata } from "next";
import { fetchGarments } from "@/app/actions/garment-actions";
import { GarmentGrid } from "@/components/client/showroom/GarmentGrid";
import { ShowroomFilter } from "@/components/client/showroom/ShowroomFilter";

/**
 * Story 5.1: Digital Showroom Catalog
 * Server Component with SSG/ISR for optimal performance
 * Route Group: (customer) - public browsing, no auth required
 */

export const metadata: Metadata = {
  title: "Showroom - Áo Dài Cho Thuê",
  description: "Khám phá bộ sưu tập áo dài cho thuê với đa dạng màu sắc và phong cách, phù hợp với mọi dịp lễ.",
  keywords: ["áo dài", "cho thuê", "lễ cưới", "khai trương", "tết"],
};

export default async function ShowroomPage() {
  // Fetch initial garment list on server (SSG/ISR)
  const response = await fetchGarments({ page: 1, page_size: 20 });

  const garments = response?.data?.items || [];
  const total = response?.data?.total || 0;

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      {/* Header */}
      <header className="bg-[#1A2B4C] text-[#F9F7F2] py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-serif font-bold text-center" style={{ fontFamily: "Cormorant Garamond, serif" }}>
            Showroom Áo Dài
          </h1>
          <p className="text-center mt-2 text-lg">
            Bộ sưu tập áo dài cho thuê - {total} sản phẩm
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filter Section */}
        <ShowroomFilter />

        {/* Garment Grid */}
        <div className="mt-8">
          {garments.length > 0 ? (
            <GarmentGrid garments={garments} />
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-gray-600">Không tìm thấy sản phẩm nào</p>
            </div>
          )}
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
