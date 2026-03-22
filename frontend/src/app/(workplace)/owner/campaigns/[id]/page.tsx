import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getCampaignById,
  fetchCampaignAnalytics,
  fetchCampaignRecipients,
} from "@/app/actions/campaign-actions";
import CampaignAnalyticsClient from "@/components/client/campaigns/CampaignAnalyticsClient";

/**
 * Campaign Analytics Detail Page - Story 6.4 AC #5, #6.
 * Shows send stats and recipient log. Owner only.
 */
interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user?.role !== "Owner") redirect("/");

  const { id } = await params;

  const [campaign, analytics, recipientsData] = await Promise.all([
    getCampaignById(id),
    fetchCampaignAnalytics(id),
    fetchCampaignRecipients(id, 1),
  ]);

  if (!campaign) notFound();

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <Link
            href="/owner/campaigns"
            className="inline-flex items-center text-stone-500 hover:text-indigo-900 transition-colors mb-4"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 18-6-6 6-6" />
            </svg>
            <span className="text-sm font-medium">Quay lai Danh sach</span>
          </Link>

          <h1 className="text-3xl font-serif font-bold text-indigo-950 mb-1">
            {campaign.name}
          </h1>
          <p className="text-stone-500 text-sm">Thong ke va ket qua gui chien dich</p>
        </header>

        {analytics ? (
          <CampaignAnalyticsClient
            campaign={campaign}
            analytics={analytics}
            initialRecipients={recipientsData?.data ?? []}
            initialTotal={recipientsData?.total ?? 0}
          />
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8 text-center">
            <p className="text-stone-500 font-medium">Khong the tai du lieu thong ke</p>
            <p className="text-stone-400 text-sm mt-1">Vui long thu lai sau.</p>
          </div>
        )}
      </div>

      <div className="h-20" />
    </div>
  );
}
