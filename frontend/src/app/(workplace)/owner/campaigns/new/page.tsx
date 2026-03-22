import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchTemplates, fetchSegments } from "@/app/actions/campaign-actions";
import { fetchVouchers } from "@/app/actions/voucher-actions";
import CampaignForm from "@/components/client/campaigns/CampaignForm";

/**
 * New Campaign Page - Story 6.4 AC #2, #7.
 * Server Component: prefetch templates, segments, active vouchers.
 */
export default async function NewCampaignPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user?.role !== "Owner") redirect("/");

  const [templates, segments, voucherResp] = await Promise.all([
    fetchTemplates(),
    fetchSegments(),
    fetchVouchers({ is_active: true, page_size: 100 }),
  ]);

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
            Tao Chien Dich Moi
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Dinh nghia chien dich marketing va chon doi tuong nhan
          </p>
        </header>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <CampaignForm
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
