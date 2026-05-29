import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MeasurementHistory from "@/components/client/MeasurementHistory";

/**
 * Customer Detail Page - Server Component
 * Story 1.3: Quản lý Hồ sơ & Số đo
 * 
 * AC: 9 - View customer profile with measurements history
 */
export default async function CustomerDetailPage({
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

    // Authorization check - Only Owner or Tailor can access
    if (session.user?.role !== "Owner" && session.user?.role !== "Tailor") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Customer Detail - Client Component will fetch data */}
                <MeasurementHistory customerId={id} />
            </div>
        </div>
    );
}
