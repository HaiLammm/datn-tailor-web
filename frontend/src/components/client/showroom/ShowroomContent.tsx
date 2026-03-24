"use client";

/**
 * Story 2.3: Client-side showroom content with dynamic filtering
 * Uses TanStack Query for client-side re-fetching when filters change.
 * Receives server-side initial data as props.
 */

import { Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GarmentListResponse } from "@/types/garment";
import { GarmentGrid } from "./GarmentGrid";
import { ShowroomFilter } from "./ShowroomFilter";
import { Pagination } from "./Pagination";
import { useGarments } from "./useGarments";

interface ShowroomContentProps {
  initialData?: GarmentListResponse;
}

function ShowroomContentInner({ initialData }: ShowroomContentProps) {
  const router = useRouter();
  const {
    garments,
    total,
    page,
    totalPages,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGarments(initialData);

  const handleClearFilters = useCallback(() => {
    router.push("/showroom");
  }, [router]);

  return (
    <>
      {/* Mobile Filter - horizontal, shown only on small screens */}
      <div className="md:hidden mb-4">
        <ShowroomFilter />
      </div>

      <div className="flex gap-6">
      {/* Filter Sidebar - hidden on mobile, shown on md+ */}
      <aside className="hidden md:block w-64 flex-shrink-0">
        <div className="sticky top-8">
          <ShowroomFilter />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">

      {/* Loading overlay during re-fetch */}
      <div className="relative">
        {isFetching && garments.length > 0 && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Đang tải...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="text-center py-16">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg text-gray-600 mb-4">
              Có lỗi xảy ra khi tải sản phẩm
            </p>
            <p className="text-sm text-gray-400 mb-4">{error?.message}</p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-[#1A2B4C] text-white rounded-lg hover:bg-[#2A3B5C] min-h-[44px] transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isError && !isFetching && !isLoading && garments.length === 0 && (
          <div className="text-center py-16 px-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#1A2B4C] mb-2">Không tìm thấy sản phẩm</h3>
            <p className="text-gray-500 mb-8 max-w-xs mx-auto">
              Rất tiếc, chúng tôi không tìm thấy trang phục nào khớp với bộ lọc hiện tại của bạn.
            </p>
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-[#1A2B4C] font-semibold rounded-lg hover:bg-[#C4A030] transition-colors shadow-md min-h-[44px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Xoá tất cả bộ lọc
            </button>
          </div>
        )}

        {/* Garment Grid */}
        {!isError && garments.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {total} sản phẩm
              </p>
            </div>
            <GarmentGrid garments={garments} />
          </>
        )}
      </div>

      {/* Pagination */}
      {!isError && totalPages > 1 && (
        <div className="mt-8">
          <Pagination currentPage={page} totalPages={totalPages} total={total} />
        </div>
      )}

      </div>{/* end flex-1 */}
      </div>{/* end flex */}
    </>
  );
}

export function ShowroomContent({ initialData }: ShowroomContentProps) {
  return (
    <Suspense fallback={<div className="text-center py-8">Đang tải...</div>}>
      <ShowroomContentInner initialData={initialData} />
    </Suspense>
  );
}
