import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchCampaigns, fetchCampaignsSummary } from "@/app/actions/campaign-actions";
import CampaignManagementClient from "@/components/client/campaigns/CampaignManagementClient";

const PAGE_SIZE = 20;

interface CampaignsPageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

/**
 * Owner Campaigns Management Page - Story 6.4: Broadcasting & Template SMS/SNS.
 * Server Component: fetch initial data, pass to client component.
 */
export default async function OwnerCampaignsPage({ searchParams }: CampaignsPageProps) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user?.role !== "Owner") redirect("/");

  const params = await searchParams;
  const parsed = parseInt(params.page ?? "1", 10);
  const currentPage = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
  const statusFilter = params.status ?? "";

  const [response, summary] = await Promise.all([
    fetchCampaigns({
      page: currentPage,
      page_size: PAGE_SIZE,
      status_filter: statusFilter || undefined,
    }),
    fetchCampaignsSummary(),
  ]);

  const campaigns = response?.data ?? [];
  const total = response?.meta?.total ?? 0;

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/owner"
            className="inline-flex items-center text-stone-500 hover:text-indigo-900 transition-colors mb-4"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 18-6-6 6-6" />
            </svg>
            <span className="text-sm font-medium">Quay lai Dashboard</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-indigo-950 mb-1">
                Chien dich Marketing
              </h1>
              <p className="text-stone-500 text-sm">
                Tao va quan ly chien dich phat tin hang loat toi khach hang
              </p>
            </div>

            {/* Stats summary */}
            <div className="flex gap-3 flex-wrap">
              <div className="bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm">
                <span className="text-xs text-stone-400 block uppercase tracking-tighter font-bold">
                  Tong chien dich
                </span>
                <span className="text-2xl font-mono font-bold text-indigo-900">
                  {(summary?.total_campaigns ?? 0).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm">
                <span className="text-xs text-stone-400 block uppercase tracking-tighter font-bold">
                  Da gui
                </span>
                <span className="text-2xl font-mono font-bold text-emerald-700">
                  {(summary?.sent_campaigns ?? 0).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm">
                <span className="text-xs text-stone-400 block uppercase tracking-tighter font-bold">
                  Tin thang nay
                </span>
                <span className="text-2xl font-mono font-bold text-amber-700">
                  {(summary?.total_messages_this_month ?? 0).toLocaleString("vi-VN")}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Action links */}
        <div className="flex gap-3 mb-6">
          <Link
            href="/owner/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tao chien dich moi
          </Link>
          <Link
            href="/owner/campaigns/templates"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-900 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Quan ly template
          </Link>
        </div>

        {/* Client component */}
        <CampaignManagementClient
          initialCampaigns={campaigns}
          initialTotal={total}
          initialPage={currentPage}
          initialStatusFilter={statusFilter}
        />
      </div>

      <div className="h-20" />
    </div>
  );
}
