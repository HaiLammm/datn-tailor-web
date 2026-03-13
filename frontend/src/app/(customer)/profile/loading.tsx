/**
 * Profile Route Loading UI - Story 4.4a
 * Shown while Server Components in /profile/* are loading.
 */

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1" />
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-8">
          {/* Sidebar skeleton (desktop) */}
          <div className="hidden md:block w-56 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>

          {/* Content area skeleton */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
