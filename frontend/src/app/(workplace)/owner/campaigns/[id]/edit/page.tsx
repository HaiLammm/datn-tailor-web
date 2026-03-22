import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getCampaignById,
  fetchTemplates,
  fetchSegments,
} from "@/app/actions/campaign-actions";
import { fetchVouchers } from "@/app/actions/voucher-actions";
import CampaignForm from "@/components/client/campaigns/CampaignForm";

/**
 * Edit Campaign Page - Story 6.4 AC #7.
 * Only draft campaigns can be edited (enforced by backend).
 */
interface EditCampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user?.role !== "Owner") redirect("/");

  const { id } = await params;

  const [campaign, templates, segments, voucherResp] = await Promise.all([
    getCampaignById(id),
    fetchTemplates(),
    fetchSegments(),
    fetchVouchers({ is_active: true, page_size: 100 }),
  ]);

  if (!campaign) notFound();
  if (campaign.status !== "draft") redirect(`/owner/campaigns/${id}`);

  const vouchers = voucherResp?.data ?? [];

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      <div className="max-w-2xl mx-auto px-4 py-8">
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

          <h1 className="text-3xl font-serif font-bold text-indigo-950">
            Chinh Sua Chien Dich
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Cap nhat thong tin chien dich ban nhap
          </p>
        </header>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <CampaignForm
            campaign={campaign}
            templates={templates ?? []}
            segments={segments ?? []}
            vouchers={vouchers}
          />
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}
