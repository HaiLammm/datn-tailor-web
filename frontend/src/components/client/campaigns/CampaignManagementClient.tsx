"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Campaign, CampaignStatus } from "@/types/campaign";
import { STATUS_COLORS, STATUS_LABELS, CHANNEL_LABELS, SEGMENT_LABELS } from "@/types/campaign";
import { deleteCampaign, sendCampaign } from "@/app/actions/campaign-actions";
import Link from "next/link";

const PAGE_SIZE = 20;

interface CampaignManagementClientProps {
  initialCampaigns: Campaign[];
  initialTotal: number;
  initialPage: number;
  initialStatusFilter: string;
}

export default function CampaignManagementClient({
  initialCampaigns,
  initialTotal,
  initialPage,
  initialStatusFilter,
}: CampaignManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state when server props change (after navigation/filter)
  useEffect(() => {
    setCampaigns(initialCampaigns);
  }, [initialCampaigns]);
  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const handleStatusFilter = (s: string) => {
    setStatusFilter(s);
    startTransition(() => {
      const url = s ? `/owner/campaigns?status=${s}` : "/owner/campaigns";
      router.push(url);
    });
  };

  const handleConfirmSend = async (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;
    setConfirmSend(null);
    setSendingId(campaign.id);
    const result = await sendCampaign(campaign.id);
    setSendingId(null);
    if (result.success && result.campaign) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? result.campaign! : c))
      );
      showToast(`Da gui chien dich "${campaign.name}" thanh cong!`, "success");
    } else {
      showToast(result.error || "Gui chien dich that bai", "error");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteCampaign(id);
    setDeletingId(null);
    setConfirmDelete(null);
    if (result.success) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      showToast("Da xoa chien dich", "success");
    } else {
      showToast(result.error || "Xoa that bai", "error");
    }
  };

  const filteredCampaigns = campaigns.filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const statusOptions: Array<{ value: string; label: string }> = [
    { value: "", label: "Tat ca" },
    { value: "draft", label: "Ban nhap" },
    { value: "scheduled", label: "Da lich" },
    { value: "sending", label: "Dang gui" },
    { value: "sent", label: "Da gui" },
    { value: "failed", label: "That bai" },
  ];

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-700 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === "Escape") setConfirmDelete(null); }}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-serif text-lg font-bold text-indigo-950 mb-2">Xac nhan xoa</h3>
            <p className="text-stone-600 text-sm mb-6">
              Ban co chac muon xoa chien dich nay? Hanh dong nay khong the hoan tac.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-700 hover:bg-stone-50"
              >
                Huy
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingId === confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId === confirmDelete ? "Dang xoa..." : "Xoa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send confirmation dialog */}
      {confirmSend && (() => {
        const c = campaigns.find((x) => x.id === confirmSend);
        return c ? (
          <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === "Escape") setConfirmSend(null); }}>
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="font-serif text-lg font-bold text-indigo-950 mb-2">Xac nhan gui chien dich</h3>
              <p className="text-stone-600 text-sm mb-2">
                Ban co chac muon gui chien dich <strong>&quot;{c.name}&quot;</strong>?
              </p>
              <p className="text-stone-500 text-xs mb-6">
                {c.total_recipients > 0
                  ? `Se gui den ${c.total_recipients} nguoi nhan.`
                  : "Se gui den tat ca nguoi nhan trong phan khuc."}{" "}
                Hanh dong nay khong the hoan tac.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmSend(null)}
                  className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-700 hover:bg-stone-50"
                >
                  Huy
                </button>
                <button
                  onClick={() => handleConfirmSend(confirmSend)}
                  disabled={sendingId === confirmSend}
                  className="flex-1 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50"
                >
                  {sendingId === confirmSend ? "Dang gui..." : "Gui ngay"}
                </button>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Filter bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === opt.value
                ? "bg-indigo-900 text-white border-indigo-900"
                : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Tim kiem chien dich..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"
        />
      </div>

      {/* Campaign table */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <p className="text-stone-500 font-medium">Chua co chien dich nao</p>
          <p className="text-stone-400 text-sm mt-1">Tao chien dich dau tien de bat dau</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Ten chien dich</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Kenh</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Phan khuc</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Trang thai</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Nguoi nhan</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Da gui</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                <AnimatePresence initial={false}>
                  {filteredCampaigns.map((c) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-stone-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-indigo-950">{c.name}</div>
                        <div className="text-xs text-stone-400 mt-0.5">{c.template_name}</div>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {CHANNEL_LABELS[c.channel]}
                      </td>
                      <td className="px-4 py-3 text-stone-600 text-xs">
                        {SEGMENT_LABELS[c.segment]}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-stone-600">
                        {c.total_recipients.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">
                        {c.sent_count.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {/* Send button - only for draft/scheduled */}
                          {(c.status === "draft" || c.status === "scheduled") && (
                            <button
                              onClick={() => setConfirmSend(c.id)}
                              disabled={sendingId === c.id}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
                              title="Gui ngay"
                            >
                              {sendingId === c.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                              )}
                            </button>
                          )}

                          {/* Analytics link - for sent campaigns */}
                          {c.status === "sent" && (
                            <Link
                              href={`/owner/campaigns/${c.id}`}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Xem analytics"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </Link>
                          )}

                          {/* Edit link - only draft */}
                          {c.status === "draft" && (
                            <Link
                              href={`/owner/campaigns/${c.id}/edit`}
                              className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors"
                              title="Chinh sua"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                          )}

                          {/* Delete button - only draft or failed */}
                          {(c.status === "draft" || c.status === "failed") && (
                            <button
                              onClick={() => setConfirmDelete(c.id)}
                              disabled={deletingId === c.id}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                              title="Xoa"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination info */}
          {initialTotal > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 text-sm text-stone-600">
              <span>Hien thi {Math.min(PAGE_SIZE, campaigns.length)} / {initialTotal} chien dich</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { const url = statusFilter ? `/owner/campaigns?status=${statusFilter}&page=${initialPage - 1}` : `/owner/campaigns?page=${initialPage - 1}`; router.push(url); }}
                  disabled={initialPage <= 1 || isPending}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Trang truoc
                </button>
                <span className="px-3 py-1.5">Trang {initialPage} / {Math.ceil(initialTotal / PAGE_SIZE)}</span>
                <button
                  onClick={() => { const url = statusFilter ? `/owner/campaigns?status=${statusFilter}&page=${initialPage + 1}` : `/owner/campaigns?page=${initialPage + 1}`; router.push(url); }}
                  disabled={initialPage >= Math.ceil(initialTotal / PAGE_SIZE) || isPending}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
