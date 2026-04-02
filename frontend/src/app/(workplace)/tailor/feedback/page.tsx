import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Tailor Feedback Page — Placeholder (Dashboard Restructure)
 *
 * Server component: handles auth guard, renders placeholder for future feedback feature.
 */
export default async function TailorFeedbackPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "Tailor" && session.user?.role !== "Owner") {
    redirect("/");
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Phản hồi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Nhận phản hồi từ chủ tiệm và khách hàng
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-[#1A2B4C]/10 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-[#1A2B4C]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-2">
            Tính năng phản hồi đang được phát triển
          </h2>

          {/* Description */}
          <p className="text-sm text-gray-600 max-w-md mb-6">
            Chức năng nhận phản hồi từ chủ tiệm và khách hàng sẽ sớm ra mắt.
            Bạn sẽ có thể xem đánh giá, góp ý và giao tiếp trực tiếp với
            khách hàng của mình.
          </p>

          {/* Future Features List */}
          <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md w-full">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Tính năng sắp có:
            </p>
            <ul className="space-y-1 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Nhận đánh giá từ khách hàng sau khi hoàn thành công việc</span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Xem góp ý và lời nhắn từ chủ tiệm</span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Trả lời và trao đổi với khách hàng</span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Xem điểm đánh giá trung bình và xu hướng</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
