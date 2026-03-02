import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CustomerListTable from "@/components/client/CustomerListTable";

/**
 * Customer List Page - Server Component
 * Story 1.3: Quản lý Hồ sơ & Số đo
 * 
 * AC: 7, 8 - List customers with search and pagination
 */
export default async function CustomersPage() {
    const session = await auth();

    // Authentication check
    if (!session) {
        redirect("/login");
    }

    // Authorization check - Only Owner or Tailor can access
    if (session.user?.role !== "Owner" && session.user?.role !== "Tailor") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-serif font-bold text-indigo-900 mb-2">
                        Quản lý Khách hàng
                    </h1>
                    <p className="text-gray-600">
                        Danh sách khách hàng và thông tin số đo
                    </p>
                </div>

                {/* Customer List Table - Client Component */}
                <CustomerListTable />
            </div>
        </div>
    );
}
