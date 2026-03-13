/**
 * Profile Notifications Page - Story 4.4a placeholder
 * Full implementation: Story 4.4f (Thông báo)
 */

// Auth guard is handled by parent profile/layout.tsx
export default function ProfileNotificationsPage() {
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
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-3">
          Thông báo
        </h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Sắp ra mắt — chức năng thông báo đơn hàng và lịch hẹn đang được phát
          triển.
        </p>
      </div>
    </div>
  );
}
