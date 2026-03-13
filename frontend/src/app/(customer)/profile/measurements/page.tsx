/**
 * Profile Measurements Page - Story 4.4a placeholder
 * Full implementation: Story 4.4d (Số đo cơ thể)
 */

// Auth guard is handled by parent profile/layout.tsx
export default function ProfileMeasurementsPage() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="text-center py-12">
        <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 7h3m13 0h-3M4 17h3m13 0h-3M4 12h3m13 0h-3"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-3">
          Số đo cơ thể
        </h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Sắp ra mắt — chức năng quản lý số đo cơ thể đang được phát triển.
        </p>
      </div>
    </div>
  );
}
