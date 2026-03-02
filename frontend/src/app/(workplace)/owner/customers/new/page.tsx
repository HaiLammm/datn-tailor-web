import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CustomerForm from "@/components/client/CustomerForm";

/**
 * Create Customer Page - Server Component
 * Story 1.3: Quản lý Hồ sơ & Số đo
 * 
 * AC: 2, 3, 4, 5, 6 - Create customer with validation
 */
export default async function NewCustomerPage() {
    const session = await auth();

    // Authentication check
    if (!session) {
        redirect("/login");
    }

    // Authorization check - Only Owner or Tailor can create customers
    if (session.user?.role !== "Owner" && session.user?.role !== "Tailor") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-serif font-bold text-indigo-900 mb-2">
                        Thêm Khách hàng Mới
                    </h1>
                    <p className="text-gray-600">
                        Nhập thông tin khách hàng và số đo (tùy chọn)
                    </p>
                </div>

                {/* Customer Form - Client Component */}
                <CustomerForm />
            </div>
        </div>
    );
}
