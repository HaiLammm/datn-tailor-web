/**
 * Profile Orders Page - Story 4.4a placeholder
 * Full implementation: Story 4.4c (Lịch sử mua hàng & Trạng thái đơn)
 */

// Auth guard is handled by parent profile/layout.tsx
export default function ProfileOrdersPage() {
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
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-3">
          Lịch sử mua hàng
        </h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Sắp ra mắt — chức năng xem lịch sử đơn hàng đang được phát triển.
        </p>
      </div>
    </div>
  );
}
