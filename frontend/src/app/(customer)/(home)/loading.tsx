import { GarmentGridSkeleton } from "@/components/client/showroom/GarmentGridSkeleton";

/**
 * Story 15.5: Route-level loading fallback for the (customer) group.
 * Shown while a page (notably the homepage, which awaits a server fetch)
 * resolves. A full-bleed hero placeholder + a featured-row skeleton keep
 * spatial context instead of a blank page or spinner.
 * GarmentGridSkeleton carries the single role="status" live region.
 */
export default function Loading() {
  return (
    <div className="bg-[#F9F7F2]">
      {/* Hero placeholder */}
      <div
        aria-hidden="true"
        className="min-h-[60vh] md:min-h-[70vh] bg-gradient-to-br from-[#101b33] via-[#1A2B4C] to-[#22335A] animate-pulse"
      />
      {/* Featured-row placeholder */}
      <div className="container mx-auto px-4 py-20">
        <div
          aria-hidden="true"
          className="h-9 w-56 bg-gray-200 rounded animate-pulse mb-10"
        />
        <GarmentGridSkeleton count={4} />
      </div>
    </div>
  );
}
