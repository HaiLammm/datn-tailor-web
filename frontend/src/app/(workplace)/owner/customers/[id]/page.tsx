import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import MeasurementHistory from "@/components/client/MeasurementHistory";
import { CustomerWithMeasurementsResponse } from "@/types/customer";

/**
 * Customer Detail Page - Server Component
 * Story 1.3: Quản lý Hồ sơ & Số đo
 * 
 * AC: 9 - View customer profile with measurements history
 */
export default async function CustomerDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await auth();

    // Authentication check
    if (!session) {
        redirect("/login");
    }

    // Authorization check - Only Owner or Tailor can access
    if (session.user?.role !== "Owner" && session.user?.role !== "Tailor") {
        redirect("/");
    }

    // Fetch customer data from API
    let customer: CustomerWithMeasurementsResponse | null = null;
    try {
        // In production, this would be an actual API call
        // For now, we'll handle this in the client component via React Query
        customer = null; // Will be fetched by client component
    } catch (error) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Customer Detail - Client Component will fetch data */}
                <MeasurementHistory customerId={params.id} />
            </div>
        </div>
    );
}
