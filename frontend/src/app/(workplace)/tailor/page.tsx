import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Tailor Dashboard - Placeholder page for Story 1.1
 * Full functionality will be implemented in later stories.
 */
export default async function TailorDashboard() {
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    if (session.user?.role !== "Tailor" && session.user?.role !== "Owner") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-serif font-bold text-indigo-900 mb-2">
                        Bàn làm việc Thợ may
                    </h1>
                    <p className="text-gray-600">
                        Xin chào, <span className="font-medium text-indigo-700">{session.user.email}</span>
                    </p>
                </div>

                {/* Role Badge */}
                <div className="mb-8">
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                        Vai trò: {session.user.role}
                    </span>
                </div>

                {/* Placeholder Content */}
                <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-8">
                    <div className="text-center py-12">
                        <div className="mx-auto w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-3">
                            Công cụ may đo đang được phát triển
                        </h2>
                        <p className="text-gray-600 max-w-md mx-auto mb-8">
                            Các tính năng Adaptive Canvas, Geometric Transformation, và Manufacturing Blueprint 
                            sẽ được triển khai trong Epic 2-4. Hiện tại bạn đã đăng nhập thành công.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <a
                                href="/api/auth/signout"
                                className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Đăng xuất
                            </a>
                        </div>
                    </div>
                </div>

                {/* Feature Preview */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">Adaptive Canvas</h3>
                        <p className="text-sm text-gray-600">Epic 3: Real-time pattern visualization</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">Sanity Check Dashboard</h3>
                        <p className="text-sm text-gray-600">Epic 4: Measurements validation</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">SVG Blueprint Export</h3>
                        <p className="text-sm text-gray-600">Epic 4: Production-ready patterns</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
