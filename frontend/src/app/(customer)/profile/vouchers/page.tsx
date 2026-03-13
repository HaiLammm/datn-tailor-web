/**
 * Profile Vouchers Page - Story 4.4a placeholder
 * Full implementation: Story 4.4g (Kho Voucher)
 */

// Auth guard is handled by parent profile/layout.tsx
export default function ProfileVouchersPage() {
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
              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-3">
          Kho Voucher
        </h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Sắp ra mắt — chức năng quản lý mã giảm giá đang được phát triển.
        </p>
      </div>
    </div>
  );
}
