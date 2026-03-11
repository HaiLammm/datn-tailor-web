"use client";

/**
 * Story 2.2: ProductDetailSkeleton — Skeleton loading cho trang chi tiết sản phẩm
 * Không dùng spinner — dùng skeleton placeholder để duy trì spatial context.
 */

export function ProductDetailSkeleton() {
  return (
    <div
      className="min-h-screen bg-[#F9F7F2]"
      aria-busy="true"
      aria-label="Đang tải thông tin sản phẩm..."
      role="status"
    >
      {/* Header skeleton */}
      <div className="bg-[#1A2B4C] py-6">
        <div className="container mx-auto px-4">
          <div className="h-4 w-32 bg-white/20 rounded animate-pulse mb-3" />
          <div className="h-8 w-64 bg-white/20 rounded animate-pulse" />
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* 2-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8">
            {/* Image skeleton */}
            <div className="space-y-3">
              <div className="w-full min-h-[420px] bg-gray-200 rounded-lg animate-pulse" />
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-16 h-16 bg-gray-200 rounded-md animate-pulse" />
                ))}
              </div>
            </div>

            {/* Info skeleton */}
            <div className="space-y-5">
              {/* Price */}
              <div>
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
              </div>

              {/* Toggle */}
              <div className="h-11 w-40 bg-gray-200 rounded-lg animate-pulse" />

              {/* Description */}
              <div className="space-y-2">
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
              </div>

              {/* Tags */}
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
              </div>

              {/* Sizes */}
              <div className="flex gap-2">
                {["S", "M", "L"].map((s) => (
                  <div key={s} className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>

              {/* Size chart accordion */}
              <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />

              {/* CTA */}
              <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
