/**
 * Tailor Review Page - Server Component
 * Story 4.2 Task 4.2: Dedicated review route for Tailors.
 *
 * RBAC: Only Tailor and Owner roles can access.
 * Loads customer + design data and passes to SanityCheckDashboard.
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { SanityCheckDashboard } from "@/components/client/design";
import { fetchSanityCheck } from "@/app/actions/geometry-actions";

interface ReviewPageProps {
  searchParams: Promise<{
    customer_id?: string;
    design_sequence_id?: string;
  }>;
}

export default async function TailorReviewPage({ searchParams }: ReviewPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // RBAC: Only Tailor and Owner roles
  if (session.user?.role !== "Tailor" && session.user?.role !== "Owner") {
    redirect("/");
  }

  const params = await searchParams;
  const customerId = params.customer_id;
  const designSequenceId = params.design_sequence_id
    ? parseInt(params.design_sequence_id, 10)
    : undefined;

  const sanityData = await fetchSanityCheck(customerId, designSequenceId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-indigo-900 mb-2">
            Bảng đối soát kỹ thuật
          </h1>
          <p className="text-gray-600">
            Xem xét và đối soát số đo khách hàng với mẫu chuẩn và đề xuất AI.
          </p>
        </div>

        {/* Sanity Check Dashboard */}
        <SanityCheckDashboard data={sanityData} />

        {/* Back link */}
        <div className="mt-8">
          <a
            href="/tailor"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại bàn làm việc
          </a>
        </div>
      </div>
    </div>
  );
}
