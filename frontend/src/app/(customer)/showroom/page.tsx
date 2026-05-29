import { Metadata } from "next";
import { fetchGarments } from "@/app/actions/garment-actions";
import { ShowroomContent } from "@/components/client/showroom/ShowroomContent";
import { ShowroomEditorial } from "@/components/client/showroom/ShowroomEditorial";
import { ShowroomTrustStrip } from "@/components/client/showroom/ShowroomTrustStrip";
import { HeroBanner } from "@/components/client/brand/HeroBanner";
import { isValidEnum } from "@/utils/enum-utils";
import {
  GarmentCategory,
  GarmentMaterial,
  GarmentOccasion,
  GarmentStatus,
} from "@/types/garment";
import { auth } from "@/auth";

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

  const orderSuccess = params.order_success === "true";

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

  // Check auth for voucher discount preview
  const session = await auth();
  const isAuthenticated = !!session?.user;

  return (
    <div className="bg-[#F9F7F2]">
      {/* Compact boutique hero (Story 15.2) */}
      <HeroBanner
        variant="showroom-compact"
        title="Bộ sưu tập áo dài"
        subline="Những tà áo cho mọi dịp vui — để bạn luôn rạng rỡ trong từng khoảnh khắc đáng nhớ."
      />

      {/* Order success banner */}
      {orderSuccess && (
        <div className="bg-emerald-50 border-b border-emerald-200">
          <div className="container mx-auto px-4 py-4 flex items-center justify-center gap-3">
            <svg className="w-6 h-6 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-emerald-800 font-medium">Đơn hàng đã được tạo thành công! Cảm ơn bạn đã mua sắm.</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Editorial storytelling (Story 15.2) */}
        <ShowroomEditorial />

        <ShowroomContent initialData={initialData} isAuthenticated={isAuthenticated} />

        {/* Trust signals — visible even when the grid is empty (Story 15.2) */}
        <ShowroomTrustStrip />
      </div>
    </div>
  );
}

