import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CustomerEditForm from "@/components/client/CustomerEditForm";

/**
 * Edit Customer Page - Server Component
 * Story 1.3: Quản lý Hồ sơ & Số đo
 *
 * AC: 10 - Chỉnh sửa thông tin khách hàng (Owner/Tailor)
 */
export default async function EditCustomerPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    const { id } = await params;

    // Authentication check
    if (!session) {
        redirect("/login");
    }

    // Authorization check - Only Owner or Tailor can edit customers
    if (session.user?.role !== "Owner" && session.user?.role !== "Tailor") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-serif font-bold text-indigo-900 mb-2">
                        Chỉnh sửa Khách hàng
                    </h1>
                    <p className="text-gray-600">Cập nhật thông tin liên hệ và ghi chú của khách hàng</p>
                </div>

                {/* Edit Form - Client Component */}
                <CustomerEditForm customerId={id} />
            </div>
        </div>
    );
}
