import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchVouchers, fetchVoucherStats } from "@/app/actions/voucher-actions";
import VoucherManagementClient from "@/components/client/vouchers/VoucherManagementClient";

const PAGE_SIZE = 20;

interface VouchersPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

/**
 * Owner Vouchers Management Page - Story 6.3: Voucher Creator UI.
 * Server Component: fetch initial data, pass to client component.
 */
export default async function OwnerVouchersPage({ searchParams }: VouchersPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }
  if (session.user?.role !== "Owner") {
    redirect("/");
  }

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));
  const searchQuery = params.search ?? "";

  const [response, stats] = await Promise.all([
    fetchVouchers({
      page: currentPage,
      page_size: PAGE_SIZE,
      search: searchQuery || undefined,
    }),
    fetchVoucherStats(),
  ]);

  const vouchers = response?.data ?? [];
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="text-sm font-medium">Quay lai Dashboard</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-indigo-950 mb-1">
                Quản lý Voucher
              </h1>
              <p className="text-stone-500 text-sm">
                Tạo, sửa, và quản lý mã giảm giá cho khách hàng
              </p>
            </div>

            {/* Stats summary */}
            <div className="flex gap-3">
              <div className="bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm">
                <span className="text-xs text-stone-400 block uppercase tracking-tighter font-bold">
                  Tổng voucher
                </span>
                <span className="text-2xl font-mono font-bold text-indigo-900">
                  {(stats?.total_vouchers ?? 0).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm">
                <span className="text-xs text-stone-400 block uppercase tracking-tighter font-bold">
                  Đang hoạt động
                </span>
                <span className="text-2xl font-mono font-bold text-emerald-700">
                  {(stats?.active_vouchers ?? 0).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm">
                <span className="text-xs text-stone-400 block uppercase tracking-tighter font-bold">
                  Tỷ lệ sử dụng
                </span>
                <span className="text-2xl font-mono font-bold text-amber-700">
                  {(stats?.redemption_rate ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Client component */}
        <VoucherManagementClient
          initialVouchers={vouchers}
          initialTotal={total}
          initialPage={currentPage}
          initialSearch={searchQuery}
        />
      </div>

      <div className="h-20" />
    </div>
  );
}
