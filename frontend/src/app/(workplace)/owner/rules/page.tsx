import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { RuleEditorClient } from "@/components/client/rules";

/**
 * Smart Rules Editor Page - Server Component
 * Story 2.5: Phác thảo Giao diện Rule Editor
 *
 * AC1: Display rules grouped by Style Pillar
 * AC5: Owner-only access
 */
export default async function RuleEditorPage() {
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    if (session.user?.role !== "Owner") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-serif font-bold text-indigo-900 mb-2">
                        Quản lý Quy tắc Thông minh
                    </h1>
                    <p className="text-gray-600">
                        Xem và chỉnh sửa các quy tắc thiết kế cho từng trụ cột phong cách
                    </p>
                </div>

                <RuleEditorClient />
            </div>
        </div>
    );
}
