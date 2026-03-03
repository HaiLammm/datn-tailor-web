import { auth } from "@/auth";
import { redirect } from "next/navigation";
import StaffTable from "@/components/client/StaffTable";

/**
 * Staff Management Page - Server Component
 * Story 1.4: Quản lý & Tạo tài khoản Nhân viên
 * 
 * AC: 1, 2, 3 - Staff whitelist management and active staff directory
 * Authorization: Owner only
 */
export default async function StaffManagementPage() {
    const session = await auth();

    // Authentication check
    if (!session) {
        redirect("/login");
    }

    // Authorization check - Only Owner can access
    if (session.user?.role !== "Owner") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-serif font-bold text-indigo-900 mb-2">
                        Quản lý Nhân sự
                    </h1>
                    <p className="text-gray-600">
                        Quản lý quyền truy cập và danh sách nhân viên hệ thống
                    </p>
                </div>

                {/* Staff Table - Client Component */}
                <StaffTable />
            </div>
        </div>
    );
}
