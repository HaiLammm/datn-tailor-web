/**
 * Story 15.2: GarmentGridSkeleton — skeleton grid shown during initial load.
 * Mirrors GarmentGrid layout (1 / 2 / 3 cols) to preserve spatial context.
 */

interface GarmentGridSkeletonProps {
  count?: number;
}

export function GarmentGridSkeleton({ count = 6 }: GarmentGridSkeletonProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      role="status"
      aria-busy="true"
      data-testid="garment-grid-skeleton"
    >
      <span className="sr-only">Đang tải sản phẩm…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          data-testid="garment-card-skeleton"
          aria-hidden="true"
          className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm"
        >
          {/* Image block */}
          <div className="w-full aspect-[3/4] bg-gray-200 animate-pulse" />
          {/* Body */}
          <div className="p-4 space-y-3">
            <div className="h-3 w-1/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-2/5 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
