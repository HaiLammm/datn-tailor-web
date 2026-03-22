"use client";

/**
 * LeadsBoardClient - Story 6.1 & 6.2: CRM Leads Board + Lead Conversion
 *
 * Interactive leads management board with:
 * - Data table: Name, Phone, Source, Classification badge, Date, Actions
 * - Click-to-cycle classification (Hot → Warm → Cold → Hot)
 * - Filter bar: by classification, source, search by name/phone
 * - "Add Lead" modal form
 * - Delete confirmation dialog
 * - "Chuyển khách" (Convert Lead → Customer) with confirmation dialog
 * - Optimistic UI via TanStack Query mutations
 * - Framer Motion exit animation on conversion
 */

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Lead,
  LeadClassification,
  LeadFilter,
  LeadSource,
  LEAD_CLASSIFICATION_COLORS,
  LEAD_CLASSIFICATION_LABELS,
  LEAD_SOURCE_LABELS,
} from "@/types/lead";
import {
  fetchLeads,
  createLead,
  updateLead,
  deleteLead,
  updateLeadClassification,
  convertLeadToCustomer,
} from "@/app/actions/lead-actions";

const PAGE_SIZE = 20;

const CLASSIFICATION_CYCLE: Record<LeadClassification, LeadClassification> = {
  hot: "warm",
  warm: "cold",
  cold: "hot",
};

interface LeadsBoardClientProps {
  initialLeads: Lead[];
  initialTotal: number;
}

// ─── Classification Badge (click-to-cycle) ────────────────────────────────────
function ClassificationBadge({
  lead,
  onCycle,
  isUpdating,
}: {
  lead: Lead;
  onCycle: (lead: Lead) => void;
  isUpdating: boolean;
}) {
  const cls = lead.classification as LeadClassification;
  const colors = LEAD_CLASSIFICATION_COLORS[cls];

  return (
    <button
      onClick={() => onCycle(lead)}
      disabled={isUpdating}
      title="Click để đổi phân loại"
      className={`
        inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
        border transition-all duration-150 cursor-pointer
        hover:opacity-80 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${colors.bg} ${colors.text} ${colors.border}
      `}
    >
      {cls === "hot" && "🟢"}
      {cls === "warm" && "🟡"}
      {cls === "cold" && "🔴"}
      {LEAD_CLASSIFICATION_LABELS[cls].replace(/\s*[🟢🟡🔴]/, "")}
    </button>
  );
}

// ─── Source Badge ─────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source: LeadSource }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-stone-100 text-stone-600">
      {LEAD_SOURCE_LABELS[source]}
    </span>
  );
}

// ─── Add Lead Modal ───────────────────────────────────────────────────────────
function AddLeadModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    phone: string;
    email: string;
    source: LeadSource;
    classification: LeadClassification;
    notes: string;
  }) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "manual" as LeadSource,
    classification: "warm" as LeadClassification,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Vui lòng nhập tên";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Email không hợp lệ";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  const handleClose = () => {
    setForm({ name: "", phone: "", email: "", source: "manual", classification: "warm", notes: "" });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-indigo-950">Thêm Lead Mới</h2>
          <button
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nguyễn Thị Lan"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="0901234567"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="lan@example.com"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Source + Classification (2 columns) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Nguồn
              </label>
              <select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as LeadSource }))}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
              >
                {(Object.entries(LEAD_SOURCE_LABELS) as [LeadSource, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Phân loại
              </label>
              <select
                value={form.classification}
                onChange={(e) =>
                  setForm((f) => ({ ...f, classification: e.target.value as LeadClassification }))
                }
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
              >
                <option value="hot">🟢 Hot</option>
                <option value="warm">🟡 Warm</option>
                <option value="cold">🔴 Cold</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Ghi chú
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Khách hỏi về áo dài cưới..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-900 text-white text-sm font-medium hover:bg-indigo-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Đang lưu..." : "Thêm Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Dialog ────────────────────────────────────────────────
function DeleteConfirmDialog({
  lead,
  onConfirm,
  onCancel,
  isLoading,
}: {
  lead: Lead | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">Xóa lead?</h3>
            <p className="text-sm text-stone-500">
              Xóa <span className="font-medium text-stone-700">{lead.name}</span> khỏi danh sách. Hành động này không thể hoàn tác.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Đang xóa..." : "Xóa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Convert Confirmation Dialog (Story 6.2) ──────────────────────────────────
function ConvertConfirmDialog({
  lead,
  onConfirm,
  onCancel,
  isLoading,
}: {
  lead: Lead | null;
  onConfirm: (createAccount: boolean) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [createAccount, setCreateAccount] = useState(false);

  if (!lead) return null;

  const cls = lead.classification as LeadClassification;
  const colors = LEAD_CLASSIFICATION_COLORS[cls];
  const isNotHot = cls !== "hot";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">Chuyển Lead thành Khách hàng?</h3>
          </div>
        </div>

        {/* Lead summary */}
        <div className="bg-stone-50 rounded-lg p-3 mb-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-900">{lead.name}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
              {cls === "hot" && "🟢"}{cls === "warm" && "🟡"}{cls === "cold" && "🔴"}
              {" "}{cls.charAt(0).toUpperCase() + cls.slice(1)}
            </span>
          </div>
          {lead.phone && (
            <div className="text-xs text-stone-500 font-mono">{lead.phone}</div>
          )}
          {lead.email && (
            <div className="text-xs text-stone-500">{lead.email}</div>
          )}
        </div>

        {/* Warning for non-Hot leads */}
        {isNotHot && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            ⚠️ Lead chưa ở trạng thái Hot. Bạn có chắc muốn chuyển?
          </div>
        )}

        {/* Create account checkbox (only if lead has email) */}
        {lead.email && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={createAccount}
              onChange={(e) => setCreateAccount(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-stone-600">
              Tạo tài khoản đăng nhập cho khách
            </span>
          </label>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onConfirm(createAccount)}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#D4AF37" }}
          >
            {isLoading ? "Đang chuyển..." : "Chuyển khách"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast Notification ───────────────────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
        type === "success"
          ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
          : "bg-red-50 border border-red-200 text-red-700"
      }`}
    >
      <div className="flex items-center gap-2">
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-70">✕</button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeadsBoardClient({
  initialLeads,
  initialTotal,
}: LeadsBoardClientProps) {
  const queryClient = useQueryClient();

  // Filter state
  const [filters, setFilters] = useState<LeadFilter>({
    page: 1,
    page_size: PAGE_SIZE,
    sort_by: "created_at",
    sort_order: "desc",
  });

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [convertTarget, setConvertTarget] = useState<Lead | null>(null);
  const [addFormKey, setAddFormKey] = useState(0); // P-9: reset form on successful submit

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // P-3: Debounce timer ref for search input
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Queries ─────────────────────────────────────────────────────────────
  // Only use initialData for default filters (no search/filter applied, page 1).
  // Otherwise TanStack treats initialData as "fresh" for all query key variants
  // and never refetches when filters change.
  const isDefaultFilters =
    !filters.classification && !filters.source && !filters.search && filters.page === 1;

  const { data, isFetching } = useQuery({
    queryKey: ["leads", filters],
    queryFn: () => fetchLeads(filters),
    initialData: isDefaultFilters
      ? {
          data: {
            items: initialLeads,
            total: initialTotal,
            page: 1,
            page_size: PAGE_SIZE,
            total_pages: Math.ceil(initialTotal / PAGE_SIZE) || 1,
          },
          meta: {
            total: initialTotal,
            page: 1,
            page_size: PAGE_SIZE,
            total_pages: Math.ceil(initialTotal / PAGE_SIZE) || 1,
          },
        }
      : undefined,
    staleTime: 30_000,
  });

  const leads = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.total_pages ?? 1;

  // ─── Mutations ────────────────────────────────────────────────────────────
  // Ref to capture filters at mutation time (avoids stale closure in onError)
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const classificationMutation = useMutation({
    mutationFn: ({ id, classification }: { id: string; classification: "hot" | "warm" | "cold" }) =>
      updateLeadClassification(id, classification),
    onMutate: async ({ id, classification }) => {
      const snapshotKey = ["leads", filtersRef.current] as const;
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previous = queryClient.getQueryData(snapshotKey);
      queryClient.setQueryData(snapshotKey, (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.map((l: Lead) =>
              l.id === id ? { ...l, classification } : l
            ),
          },
        };
      });
      return { previous, snapshotKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.snapshotKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Parameters<typeof createLead>[0]) => {
      const result = await createLead(data);
      if (!result.success) throw new Error(result.error || "Tạo lead thất bại");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsAddModalOpen(false);
      // Reset form state after successful create
      setAddFormKey((k) => k + 1);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteLead(id);
      if (!result.success) throw new Error(result.error || "Xóa lead thất bại");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setDeleteTarget(null);
    },
  });

  // Story 6.2: Convert Lead → Customer mutation with optimistic UI
  const convertMutation = useMutation({
    mutationFn: async ({ id, createAccount }: { id: string; createAccount: boolean }) => {
      const result = await convertLeadToCustomer(id, createAccount);
      if (!result.success) throw new Error(result.error || "Chuyển lead thất bại");
      return result;
    },
    onMutate: async ({ id }) => {
      // Optimistic: remove lead from list immediately
      const snapshotKey = ["leads", filtersRef.current] as const;
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previous = queryClient.getQueryData(snapshotKey);
      queryClient.setQueryData(snapshotKey, (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.filter((l: Lead) => l.id !== id),
            total: old.data.total - 1,
          },
          meta: {
            ...old.meta,
            total: old.meta.total - 1,
          },
        };
      });
      return { previous, snapshotKey };
    },
    onSuccess: (_data, variables) => {
      const lead = convertTarget;
      setConvertTarget(null);
      showToast(
        `Đã chuyển ${lead?.name || "lead"} thành khách hàng thành công!`,
        "success"
      );
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error, _vars, context) => {
      // Rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(context.snapshotKey, context.previous);
      }
      setConvertTarget(null);
      showToast(
        error instanceof Error ? error.message : "Chuyển lead thất bại",
        "error"
      );
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCycleClassification = useCallback(
    (lead: Lead) => {
      const next = CLASSIFICATION_CYCLE[lead.classification as LeadClassification];
      classificationMutation.mutate({ id: lead.id, classification: next });
    },
    [classificationMutation]
  );

  const handleFilterChange = useCallback(
    (key: keyof LeadFilter, value: string | number | null | undefined) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value ?? undefined,
        page: key !== "page" ? 1 : (value as number),
      }));
    },
    []
  );

  // P-3: Debounced search handler
  const handleSearchChange = useCallback(
    (value: string) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        handleFilterChange("search", value || null);
      }, 350);
    },
    [handleFilterChange]
  );

  // P-2: Sort handler for clickable column headers
  const handleSort = useCallback(
    (field: "name" | "source" | "classification" | "created_at") => {
      setFilters((prev) => ({
        ...prev,
        sort_by: field,
        sort_order: prev.sort_by === field && prev.sort_order === "asc" ? "desc" : "asc",
        page: 1,
      }));
    },
    []
  );

  const handleAddLead = useCallback(
    (formData: {
      name: string;
      phone: string;
      email: string;
      source: LeadSource;
      classification: LeadClassification;
      notes: string;
    }) => {
      createMutation.mutate({
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        source: formData.source,
        classification: formData.classification,
        notes: formData.notes || null,
      });
    },
    [createMutation]
  );

  // ─── Format date ─────────────────────────────────────────────────────────
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
  };

  const updatingId = classificationMutation.variables?.id ?? null;

  return (
    <>
      {/* ─── Error Messages ────────────────────────────────────────────── */}
      {(createMutation.error || deleteMutation.error) && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {createMutation.error?.message || deleteMutation.error?.message}
        </div>
      )}

      {/* ─── Filter Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm theo tên, số điện thoại..."
            defaultValue={filters.search ?? ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
        </div>

        {/* Classification filter */}
        <select
          value={filters.classification ?? ""}
          onChange={(e) =>
            handleFilterChange("classification", e.target.value || null)
          }
          className="px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white min-w-[140px]"
        >
          <option value="">Tất cả phân loại</option>
          <option value="hot">🟢 Hot</option>
          <option value="warm">🟡 Warm</option>
          <option value="cold">🔴 Cold</option>
        </select>

        {/* Source filter */}
        <select
          value={filters.source ?? ""}
          onChange={(e) =>
            handleFilterChange("source", e.target.value || null)
          }
          className="px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white min-w-[140px]"
        >
          <option value="">Tất cả nguồn</option>
          {(Object.entries(LEAD_SOURCE_LABELS) as [LeadSource, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {/* Add Lead button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white text-sm font-medium rounded-lg hover:bg-indigo-800 transition-colors whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm Lead
        </button>
      </div>

      {/* ─── Table ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {isFetching && (
          <div className="h-1 bg-indigo-200 overflow-hidden">
            <div className="h-full bg-indigo-600 animate-pulse w-1/2" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th
                  onClick={() => handleSort("name")}
                  className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide cursor-pointer hover:text-indigo-700 select-none"
                >
                  Tên {filters.sort_by === "name" && (filters.sort_order === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Liên hệ
                </th>
                <th
                  onClick={() => handleSort("source")}
                  className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide cursor-pointer hover:text-indigo-700 select-none"
                >
                  Nguồn {filters.sort_by === "source" && (filters.sort_order === "asc" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("classification")}
                  className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide cursor-pointer hover:text-indigo-700 select-none"
                >
                  Phân loại {filters.sort_by === "classification" && (filters.sort_order === "asc" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("created_at")}
                  className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide cursor-pointer hover:text-indigo-700 select-none"
                >
                  Ngày thêm {filters.sort_by === "created_at" && (filters.sort_order === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-stone-400 text-sm">
                    {isFetching
                      ? "Đang tải..."
                      : "Chưa có lead nào. Nhấn \"Thêm Lead\" để bắt đầu."}
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                {leads.map((lead) => (
                  <motion.tr
                    key={lead.id}
                    layout
                    exit={{ opacity: 0, x: 40, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-stone-50 transition-colors"
                  >
                    {/* Name + notes */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{lead.name}</div>
                      {lead.notes && (
                        <div className="text-xs text-stone-400 mt-0.5 truncate max-w-[200px]" title={lead.notes}>
                          {lead.notes}
                        </div>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      {lead.phone && (
                        <div className="font-mono text-stone-700 text-xs">{lead.phone}</div>
                      )}
                      {lead.email && (
                        <div className="text-xs text-stone-400">{lead.email}</div>
                      )}
                      {!lead.phone && !lead.email && (
                        <span className="text-xs text-stone-300">—</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      <SourceBadge source={lead.source as LeadSource} />
                    </td>

                    {/* Classification (click-to-cycle) */}
                    <td className="px-4 py-3">
                      <ClassificationBadge
                        lead={lead}
                        onCycle={handleCycleClassification}
                        isUpdating={updatingId === lead.id}
                      />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-stone-500">
                        {formatDate(lead.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {/* Story 6.2: Convert Lead → Customer */}
                        <button
                          onClick={() => setConvertTarget(lead)}
                          disabled={convertMutation.isPending}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: "#D4AF37", color: "#fff" }}
                          title="Chuyển thành khách hàng"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          Chuyển khách
                        </button>
                        <button
                          onClick={() => setDeleteTarget(lead)}
                          className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa lead"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination ──────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-400">
              {total} leads · Trang {filters.page ?? 1}/{totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleFilterChange("page", (filters.page ?? 1) - 1)}
                disabled={(filters.page ?? 1) <= 1 || isFetching}
                className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Trước
              </button>
              <button
                onClick={() => handleFilterChange("page", (filters.page ?? 1) + 1)}
                disabled={(filters.page ?? 1) >= totalPages || isFetching}
                className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}
      <AddLeadModal
        key={addFormKey}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddLead}
        isLoading={createMutation.isPending}
      />

      <DeleteConfirmDialog
        lead={deleteTarget}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />

      <ConvertConfirmDialog
        lead={convertTarget}
        onConfirm={(createAccount) => {
          if (convertTarget) {
            convertMutation.mutate({ id: convertTarget.id, createAccount });
          }
        }}
        onCancel={() => setConvertTarget(null)}
        isLoading={convertMutation.isPending}
      />

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
