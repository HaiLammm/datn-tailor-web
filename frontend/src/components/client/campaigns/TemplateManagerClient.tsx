"use client";

/**
 * TemplateManagerClient - Story 6.4 AC #1, #4, #9.
 * CRUD for message templates with live preview.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChannelType, MessageTemplate, TemplateFormData } from "@/types/campaign";
import { CHANNEL_LABELS } from "@/types/campaign";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
} from "@/app/actions/campaign-actions";

interface TemplateManagerClientProps {
  initialTemplates: MessageTemplate[];
}

type ModalMode = "create" | "edit" | "preview" | null;

const EMPTY_FORM: TemplateFormData = {
  name: "",
  channel: "email",
  subject: "",
  body: "",
};

export default function TemplateManagerClient({
  initialTemplates,
}: TemplateManagerClientProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>(initialTemplates);
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ subject: string | null; body: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [, startTransition] = useTransition();
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

  const openCreate = () => {
    setSelected(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setServerError(null);
    setModal("create");
  };

  const openEdit = (t: MessageTemplate) => {
    setSelected(t);
    setFormData({ name: t.name, channel: t.channel, subject: t.subject ?? "", body: t.body });
    setFormErrors({});
    setServerError(null);
    setModal("edit");
  };

  const openPreview = async (t: MessageTemplate) => {
    setSelected(t);
    setPreviewData(null);
    setModal("preview");
    setPreviewLoading(true);
    const data = await previewTemplate(t.id, { sample_name: "Nguyen Van A" });
    setPreviewData(data ?? { subject: t.subject, body: t.body });
    setPreviewLoading(false);
  };

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setPreviewData(null);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = "Ten template la bat buoc";
    if (formData.name.length > 100) errs.name = "Toi da 100 ky tu";
    if (formData.channel === "email" && !formData.subject.trim()) {
      errs.subject = "Tieu de la bat buoc cho email";
    }
    if (!formData.body.trim()) errs.body = "Noi dung la bat buoc";
    if (formData.body.length > 50000) errs.body = "Toi da 50,000 ky tu";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSubmitting(true);
    const payload: TemplateFormData = {
      ...formData,
      subject: formData.channel === "email" ? formData.subject : "",
    };

    const result =
      modal === "edit" && selected
        ? await updateTemplate(selected.id, payload)
        : await createTemplate(payload);

    if (result.success && result.template) {
      if (modal === "edit") {
        setTemplates((prev) =>
          prev.map((t) => (t.id === result.template!.id ? result.template! : t))
        );
        showToast("Da cap nhat template", "success");
      } else {
        setTemplates((prev) => [result.template!, ...prev]);
        showToast("Da tao template moi", "success");
      }
      closeModal();
    } else {
      setServerError(result.error || "Da xay ra loi");
    }

    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteTemplate(id);
    setDeletingId(null);
    setConfirmDelete(null);
    if (result.success) {
      startTransition(() => {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      });
      showToast("Da xoa template", "success");
    } else {
      showToast(result.error || "Xoa that bai", "error");
    }
  };

  const handleFieldChange = (field: keyof TemplateFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setServerError(null);
  };

  const VARIABLES_HINT = "{{name}}, {{shop_name}}, {{voucher_code}}, {{voucher_value}}, {{expiry_date}}";

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
              toast.type === "success" ? "bg-emerald-700 text-white" : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === "Escape") setConfirmDelete(null); }}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-serif text-lg font-bold text-indigo-950 mb-2">Xac nhan xoa</h3>
            <p className="text-stone-600 text-sm mb-6">
              Ban co chac muon xoa template nay? Khong the xoa neu dang su dung boi chien dich.
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

      {/* Create/Edit Modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-start justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === "Escape") closeModal(); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-8">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-indigo-950">
                {modal === "edit" ? "Chinh sua Template" : "Tao Template Moi"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {serverError && (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Ten template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  placeholder="VD: Khuyen mai mua he"
                  maxLength={100}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                    formErrors.name ? "border-red-400 bg-red-50" : "border-stone-300 bg-white"
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>

              {/* Channel */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Kênh <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {(["email", "sms", "zalo"] as ChannelType[]).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => handleFieldChange("channel", ch)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        formData.channel === ch
                          ? "bg-indigo-900 text-white border-indigo-900"
                          : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      {CHANNEL_LABELS[ch]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel warning for SMS/Zalo */}
              {formData.channel !== "email" && (
                <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    Kênh <strong>{CHANNEL_LABELS[formData.channel as keyof typeof CHANNEL_LABELS]}</strong> hien dang duoc xay dung.
                    Ban co the tao template nhung chua the gui qua kenh nay.
                  </span>
                </div>
              )}

              {/* Subject (email only) */}
              {formData.channel === "email" && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Tieu de email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleFieldChange("subject", e.target.value)}
                    placeholder="VD: [Tailor Shop] Uu dai dac biet danh rieng cho ban"
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                      formErrors.subject ? "border-red-400 bg-red-50" : "border-stone-300 bg-white"
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                  {formErrors.subject && <p className="text-xs text-red-500 mt-1">{formErrors.subject}</p>}
                </div>
              )}

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Noi dung <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => handleFieldChange("body", e.target.value)}
                  placeholder={`Kinh gui {{name}},\n\nChung toi xin gui tang ban ma giam gia dac biet...`}
                  rows={8}
                  maxLength={50000}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono resize-y ${
                    formErrors.body ? "border-red-400 bg-red-50" : "border-stone-300 bg-white"
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                {formErrors.body && <p className="text-xs text-red-500 mt-1">{formErrors.body}</p>}
                <p className="text-xs text-stone-400 mt-1">
                  Bien co the dung: <code className="bg-stone-100 px-1 rounded">{VARIABLES_HINT}</code>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-lg border border-stone-300 text-sm font-medium hover:bg-stone-50 transition-colors"
                >
                  Huy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg bg-indigo-900 text-white text-sm font-medium hover:bg-indigo-800 transition-colors disabled:opacity-50"
                >
                  {submitting
                    ? modal === "edit"
                      ? "Dang cap nhat..."
                      : "Dang tao..."
                    : modal === "edit"
                      ? "Cap nhat"
                      : "Tao template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {modal === "preview" && selected && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-start justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === "Escape") closeModal(); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-8">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-indigo-950">Xem truoc Template</h2>
                <p className="text-stone-400 text-xs mt-0.5">{selected.name}</p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12 text-stone-400">
                  <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Dang tai xem truoc...
                </div>
              ) : previewData ? (
                <div className="space-y-4">
                  {previewData.subject && (
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Tieu de</p>
                      <p className="text-sm font-medium text-indigo-950 px-3 py-2 bg-stone-50 rounded-lg">
                        {previewData.subject}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Noi dung</p>
                    <div className="px-4 py-3 bg-stone-50 rounded-lg text-sm text-stone-700 whitespace-pre-wrap font-mono leading-relaxed">
                      {previewData.body}
                    </div>
                  </div>
                  <p className="text-xs text-stone-400">
                    * Du lieu mau: ten = Nguyen Van A, shop = Ten Cua Hang
                  </p>
                </div>
              ) : (
                <p className="text-stone-400 text-sm">Khong the tai xem truoc.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header actions */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-stone-500 text-sm">
          {templates.length} template{templates.length !== 1 ? "" : ""}
        </p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tao template moi
        </button>
      </div>

      {/* Template list */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-stone-500 font-medium">Chua co template nao</p>
          <p className="text-stone-400 text-sm mt-1">Tao template dau tien de bat dau</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence initial={false}>
            {templates.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-xl border border-stone-200 shadow-sm p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-indigo-950 truncate">{t.name}</h3>
                      {t.is_default && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex-shrink-0">
                          Mac dinh
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full flex-shrink-0">
                        {CHANNEL_LABELS[t.channel]}
                      </span>
                    </div>
                    {t.subject && (
                      <p className="text-xs text-stone-500 mb-2 truncate">
                        <span className="font-medium text-stone-400">Chu de:</span> {t.subject}
                      </p>
                    )}
                    <p className="text-xs text-stone-400 line-clamp-2 font-mono">{t.body}</p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openPreview(t)}
                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Xem truoc"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors"
                      title="Chinh sua"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setConfirmDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      title="Xoa"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
