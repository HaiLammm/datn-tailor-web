import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchTemplates } from "@/app/actions/campaign-actions";
import TemplateManagerClient from "@/components/client/campaigns/TemplateManagerClient";

/**
 * Template Manager Page - Story 6.4 AC #1, #4, #9.
 * Server Component: fetch initial template list.
 */
export default async function TemplatesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user?.role !== "Owner") redirect("/");

  const templates = await fetchTemplates();

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <Link
            href="/owner/campaigns"
            className="inline-flex items-center text-stone-500 hover:text-indigo-900 transition-colors mb-4"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 18-6-6 6-6" />
            </svg>
            <span className="text-sm font-medium">Quay lai Chien dich</span>
          </Link>

          <h1 className="text-3xl font-serif font-bold text-indigo-950 mb-1">
            Quan ly Template
          </h1>
          <p className="text-stone-500 text-sm">
            Tao va chinh sua mau noi dung cho chien dich email
          </p>
        </header>

        {/* Variable reference */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
          <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">
            Bien co the su dung trong noi dung
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "{{name}}",
              "{{shop_name}}",
              "{{voucher_code}}",
              "{{voucher_value}}",
              "{{expiry_date}}",
            ].map((v) => (
              <code
                key={v}
                className="px-2 py-1 bg-white border border-indigo-200 rounded text-xs font-mono text-indigo-800"
              >
                {v}
              </code>
            ))}
          </div>
        </div>

        <TemplateManagerClient initialTemplates={templates ?? []} />
      </div>

      <div className="h-20" />
    </div>
  );
}
