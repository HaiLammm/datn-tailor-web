"use client";

/**
 * CampaignAnalyticsClient - Story 6.4 AC #5, #6.
 * Displays send stats and recipient log for a sent campaign.
 */

import { useState } from "react";
import type { Campaign, CampaignAnalytics, CampaignRecipient } from "@/types/campaign";
import { STATUS_COLORS, STATUS_LABELS, CHANNEL_LABELS, SEGMENT_LABELS } from "@/types/campaign";
import { fetchCampaignRecipients } from "@/app/actions/campaign-actions";

interface CampaignAnalyticsClientProps {
  campaign: Campaign;
  analytics: CampaignAnalytics;
  initialRecipients: CampaignRecipient[];
  initialTotal: number;
}

const RECIPIENT_STATUS_COLORS: Record<string, string> = {
  pending: "text-stone-500 bg-stone-100",
  sent: "text-emerald-700 bg-emerald-100",
  failed: "text-red-700 bg-red-100",
  opened: "text-blue-700 bg-blue-100",
  clicked: "text-indigo-700 bg-indigo-100",
};

const RECIPIENT_STATUS_LABELS: Record<string, string> = {
  pending: "Cho gui",
  sent: "Da gui",
  failed: "That bai",
  opened: "Da mo",
  clicked: "Da click",
};

export default function CampaignAnalyticsClient({
  campaign,
  analytics,
  initialRecipients,
  initialTotal,
}: CampaignAnalyticsClientProps) {
  const [recipients, setRecipients] = useState<CampaignRecipient[]>(initialRecipients);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const PAGE_SIZE = 50;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const loadPage = async (p: number) => {
    setLoading(true);
    const result = await fetchCampaignRecipients(campaign.id, p);
    if (result) {
      setRecipients(result.data);
      setPage(p);
      setTotal(result.total);
    }
    setLoading(false);
  };

  const sentRate =
    analytics.total_recipients > 0
      ? Math.round((analytics.sent_count / analytics.total_recipients) * 100)
      : 0;
  const failRate =
    analytics.total_recipients > 0
      ? Math.round((analytics.failed_count / analytics.total_recipients) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Campaign info */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status]}`}>
            {STATUS_LABELS[campaign.status]}
          </span>
          <span className="text-xs text-stone-400">
            {CHANNEL_LABELS[campaign.channel]}
          </span>
          <span className="text-xs text-stone-400">
            {SEGMENT_LABELS[campaign.segment]}
          </span>
          {campaign.voucher_code && (
            <span className="text-xs font-mono px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
              {campaign.voucher_code}
            </span>
          )}
        </div>
        <p className="text-xs text-stone-400">
          Template: <span className="text-stone-600">{campaign.template_name}</span>
        </p>
        {campaign.sent_at && (
          <p className="text-xs text-stone-400 mt-0.5">
            Da gui luc:{" "}
            <span className="text-stone-600">
              {new Date(campaign.sent_at).toLocaleString("vi-VN")}
            </span>
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
            Tong nguoi nhan
          </p>
          <p className="text-2xl font-mono font-bold text-indigo-900">
            {analytics.total_recipients.toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
            Da gui thanh cong
          </p>
          <p className="text-2xl font-mono font-bold text-emerald-700">
            {analytics.sent_count.toLocaleString("vi-VN")}
          </p>
          <p className="text-xs text-stone-400">{sentRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
            That bai
          </p>
          <p className="text-2xl font-mono font-bold text-red-600">
            {analytics.failed_count.toLocaleString("vi-VN")}
          </p>
          <p className="text-xs text-stone-400">{failRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
            Voucher doi
          </p>
          <p className="text-2xl font-mono font-bold text-amber-700">
            {analytics.voucher_redemptions.toLocaleString("vi-VN")}
          </p>
        </div>
      </div>

      {/* Recipients log */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-medium text-indigo-950">
            Danh sach nguoi nhan
          </h2>
          <span className="text-xs text-stone-400">{total.toLocaleString("vi-VN")} nguoi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Ten
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Trang thai
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Thoi gian gui
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Loi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-400 text-sm">
                    Dang tai...
                  </td>
                </tr>
              ) : recipients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-400 text-sm">
                    Chua co nguoi nhan
                  </td>
                </tr>
              ) : (
                recipients.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-stone-600 font-mono text-xs">
                      {r.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-700">{r.recipient_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          RECIPIENT_STATUS_COLORS[r.status] ?? "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {RECIPIENT_STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">
                      {r.sent_at
                        ? new Date(r.sent_at).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-500 max-w-xs truncate">
                      {r.error_message ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-400">
              Trang {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => loadPage(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium disabled:opacity-40 hover:bg-stone-50 transition-colors"
              >
                Trang truoc
              </button>
              <button
                onClick={() => loadPage(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium disabled:opacity-40 hover:bg-stone-50 transition-colors"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
