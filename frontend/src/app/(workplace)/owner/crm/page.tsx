import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchLeads } from "@/app/actions/lead-actions";
import LeadsBoardClient from "@/components/client/crm/LeadsBoardClient";

const PAGE_SIZE = 20;

/**
 * Owner CRM Leads Board Page - Story 6.1: Quản Trị Leads CRM.
 * Server Component: fetch dữ liệu ban đầu, pass xuống client component.
 */
export default async function OwnerCRMPage() {
  const session = await auth();

  // RBAC check
  if (!session) {
    redirect("/login");
  }
  if (session.user?.role !== "Owner") {
    redirect("/");
  }

  // Fetch initial data (SSR)
  const response = await fetchLeads({ page: 1, page_size: PAGE_SIZE });

  const leads = response?.data?.items ?? [];
  const total = response?.data?.total ?? 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
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
            <span className="text-sm font-medium">Quay lại Dashboard</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-sans font-semibold text-indigo-950 mb-1">
                CRM — Danh Sách Leads
              </h1>
              <p className="text-stone-500 text-sm">
                Theo dõi danh sách khách tiềm năng
              </p>
            </div>

            <div className="bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-400 block uppercase tracking-tighter font-bold">
                Tổng leads
              </span>
              <span className="text-2xl font-mono font-bold text-indigo-900">
                {total.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </header>

        {/* Client component xử lý interactivity */}
        <LeadsBoardClient
          initialLeads={leads}
          initialTotal={total}
        />
      </div>

      <div className="h-20" />
    </div>
  );
}
