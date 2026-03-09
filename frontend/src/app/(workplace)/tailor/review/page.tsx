/**
 * Tailor Review Page - Server Component
 * Story 4.2 Task 4.2: Dedicated review route for Tailors.
 *
 * RBAC: Only Tailor and Owner roles can access.
 * Loads customer + design data and passes to SanityCheckDashboard.
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { SanityCheckDashboard, OverrideHistoryPanel, ExportBlueprintButton } from "@/components/client/design";
import { fetchSanityCheck } from "@/app/actions/geometry-actions";
import { fetchOverrideHistory, submitOverride } from "@/app/actions/override-actions";

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

  // Story 4.3: Fetch override history if design_id found
  const overrideHistory = sanityData.design_id 
    ? await fetchOverrideHistory(sanityData.design_id)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-serif font-bold text-indigo-900 mb-2">
              Bảng đối soát kỹ thuật
            </h1>
            <p className="text-gray-600">
              Xem xét và đối soát số đo khách hàng với mẫu chuẩn và đề xuất AI.
            </p>
          </div>
          
          <div className="w-full md:w-80">
            {sanityData.design_id && (
              <ExportBlueprintButton 
                designId={sanityData.design_id} 
                isLocked={sanityData.is_locked} 
              />
            )}
          </div>
        </div>

        {/* Sanity Check Dashboard + History */}
        <div className="space-y-8">
          <SanityCheckDashboard 
            data={sanityData} 
            isOverrideEnabled={true}
            onOverride={async (key, val, reason) => {
              "use server";
              if (sanityData.design_id) {
                await submitOverride(sanityData.design_id, {
                  delta_key: key,
                  overridden_value: val,
                  reason_vi: reason,
                  sequence_id: designSequenceId ?? 0
                });
              }
            }}
          />
          
          <OverrideHistoryPanel overrides={overrideHistory} />
        </div>

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
