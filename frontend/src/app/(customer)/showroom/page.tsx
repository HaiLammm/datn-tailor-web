import { Metadata } from "next";
import { fetchGarments } from "@/app/actions/garment-actions";
import { ShowroomContent } from "@/components/client/showroom/ShowroomContent";
import { isValidEnum } from "@/utils/enum-utils";
import {
  GarmentCategory,
  GarmentMaterial,
  GarmentOccasion,
  GarmentStatus,
} from "@/types/garment";

/**
 * Story 5.1 + 2.3: Digital Showroom Catalog with Multi-Dimensional Filtering
 * Server Component with SSG/ISR for optimal performance.
 * Client-side filtering via TanStack Query in ShowroomContent.
 * Route Group: (customer) - public browsing, no auth required
 */

export const metadata: Metadata = {
  title: "Showroom - Áo Dài Cho Thuê",
  description: "Khám phá bộ sưu tập áo dài cho thuê với đa dạng màu sắc và phong cách, phù hợp với mọi dịp lễ.",
  keywords: ["áo dài", "cho thuê", "lễ cưới", "khai trương", "tết"],
};

interface ShowroomPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ShowroomPage({ searchParams }: ShowroomPageProps) {
  const params = await searchParams;

  // Extract and validate filter params from URL for initial SSR fetch
  const filters = {
    color: typeof params.color === "string" ? params.color : undefined,
    occasion: isValidEnum(params.occasion as string, GarmentOccasion)
      ? (params.occasion as GarmentOccasion)
      : undefined,
    material: isValidEnum(params.material as string, GarmentMaterial)
      ? (params.material as GarmentMaterial)
      : undefined,
    category: isValidEnum(params.category as string, GarmentCategory)
      ? (params.category as GarmentCategory)
      : undefined,
    status: isValidEnum(params.status as string, GarmentStatus)
      ? (params.status as GarmentStatus)
      : undefined,
    size: typeof params.size === "string" ? params.size : undefined,
    page: typeof params.page === "string" ? parseInt(params.page) : 1,
    page_size: typeof params.page_size === "string" ? parseInt(params.page_size) : 20,
  };

  // Fetch initial garment list on server (SSR/ISR) with current filters
  const response = await fetchGarments(filters);

  const initialData = response?.data ?? undefined;

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      {/* Header */}
      <header className="bg-[#1A2B4C] text-[#F9F7F2] py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-serif font-bold text-center" style={{ fontFamily: "Cormorant Garamond, serif" }}>
            Showroom Áo Dài
          </h1>
          <p className="text-center mt-2 text-lg">
            Bộ sưu tập áo dài cho thuê
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <ShowroomContent initialData={initialData} />
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

