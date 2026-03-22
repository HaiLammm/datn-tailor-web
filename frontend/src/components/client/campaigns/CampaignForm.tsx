"use client";

/**
 * CampaignForm - Story 6.4: Shared create/edit form for campaigns.
 *
 * Zod validation on client; backend validates independently.
 * SMS/Zalo channels show info banner (email-only MVP).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import type {
  Campaign,
  CampaignFormData,
  ChannelType,
  MessageTemplate,
  SegmentInfo,
  SegmentType,
} from "@/types/campaign";
import { CHANNEL_LABELS, SEGMENT_LABELS } from "@/types/campaign";
import { createCampaign, updateCampaign } from "@/app/actions/campaign-actions";
import type { OwnerVoucher } from "@/types/voucher";

const campaignSchema = z.object({
  name: z.string().trim().min(1, "Ten chien dich la bat buoc").max(200, "Toi da 200 ky tu"),
  channel: z.enum(["email", "sms", "zalo"] as const),
  template_id: z.string().min(1, "Vui long chon template"),
  segment: z.enum([
    "all_customers",
    "hot_leads",
    "warm_leads",
    "cold_leads",
    "voucher_holders",
  ] as const),
  voucher_id: z.string().nullable(),
  scheduled_at: z.string().nullable(),
});

interface CampaignFormProps {
  campaign?: Campaign;
  templates: MessageTemplate[];
  segments: SegmentInfo[];
  vouchers: OwnerVoucher[];
}

export default function CampaignForm({
  campaign,
  templates,
  segments,
  vouchers,
}: CampaignFormProps) {
  const router = useRouter();
  const isEdit = !!campaign;

  const [formData, setFormData] = useState<CampaignFormData>({
    name: campaign?.name ?? "",
    channel: campaign?.channel ?? "email",
    template_id: campaign?.template_id ?? "",
    segment: campaign?.segment ?? "all_customers",
    voucher_id: campaign?.voucher_id ?? null,
    scheduled_at: campaign?.scheduled_at ?? null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = <K extends keyof CampaignFormData>(
    field: K,
    value: CampaignFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setServerError(null);
  };

  const filteredTemplates = templates.filter((t) => t.channel === formData.channel);

  const currentSegment = segments.find((s) => s.segment === formData.segment);
  const isEmailChannel = formData.channel === "email";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = campaignSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString();
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const result = isEdit
      ? await updateCampaign(campaign!.id, parsed.data)
      : await createCampaign(parsed.data);

    if (result.success) {
      setSubmitting(false);
      router.push("/owner/campaigns");
      router.refresh();
    } else {
      setServerError(result.error || "Da xay ra loi");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Channel warning for SMS/Zalo */}
      {!isEmailChannel && (
        <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            Kenh <strong>{CHANNEL_LABELS[formData.channel]}</strong> hien dang duoc xay dung.
            Ban co the tao chien dich nhung chua the gui. Vui long chon kenh <strong>Email</strong> de gui ngay.
          </span>
        </div>
      )}

      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Ten chien dich <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="VD: Khuyen mai Tet 2026"
          maxLength={200}
          className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
            errors.name ? "border-red-400 bg-red-50" : "border-stone-300 bg-white"
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      {/* Channel */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Kenh gui <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          {(["email", "sms", "zalo"] as ChannelType[]).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => {
                handleChange("channel", ch);
                handleChange("template_id", "");
              }}
              className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
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

      {/* Template */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Template <span className="text-red-500">*</span>
        </label>
        {filteredTemplates.length === 0 ? (
          <div className="px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-500">
            Chua co template nao cho kenh {CHANNEL_LABELS[formData.channel]}.{" "}
            <a href="/owner/campaigns/templates" className="text-indigo-700 hover:underline">
              Tao template moi
            </a>
          </div>
        ) : (
          <select
            value={formData.template_id}
            onChange={(e) => handleChange("template_id", e.target.value)}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
              errors.template_id ? "border-red-400 bg-red-50" : "border-stone-300 bg-white"
            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          >
            <option value="">-- Chon template --</option>
            {filteredTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.is_default ? " (Mac dinh)" : ""}
              </option>
            ))}
          </select>
        )}
        {errors.template_id && (
          <p className="text-xs text-red-500 mt-1">{errors.template_id}</p>
        )}
      </div>

      {/* Segment */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Phan khuc khach hang <span className="text-red-500">*</span>
        </label>
        {segments.length === 0 && (
          <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
            Khong co phan khuc nao. Vui long tao khach hang truoc khi tao chien dich.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {segments.map((seg) => (
            <button
              key={seg.segment}
              type="button"
              onClick={() => handleChange("segment", seg.segment as SegmentType)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors ${
                formData.segment === seg.segment
                  ? "bg-indigo-50 border-indigo-500 text-indigo-900"
                  : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
              }`}
            >
              <span className="font-medium">{SEGMENT_LABELS[seg.segment as SegmentType]}</span>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                  formData.segment === seg.segment
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                {seg.recipient_count.toLocaleString("vi-VN")} nguoi
              </span>
            </button>
          ))}
        </div>
        {currentSegment && currentSegment.recipient_count === 0 && (
          <p className="text-xs text-amber-600 mt-1">
            Phan khuc nay chua co nguoi nhan. Chien dich se khong duoc gui.
          </p>
        )}
      </div>

      {/* Voucher (optional) */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Voucher dinh kem{" "}
          <span className="text-xs text-stone-400 font-normal">(tuy chon)</span>
        </label>
        <select
          value={formData.voucher_id ?? ""}
          onChange={(e) =>
            handleChange("voucher_id", e.target.value || null)
          }
          className="w-full px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">-- Khong dinh kem voucher --</option>
          {vouchers.map((v) => (
            <option key={v.id} value={v.id}>
              {v.code} —{" "}
              {v.type === "percent"
                ? `${parseFloat(v.value)}%`
                : `${parseInt(v.value, 10).toLocaleString("vi-VN")}đ`}{" "}
              (het han {v.expiry_date})
            </option>
          ))}
        </select>
        <p className="text-xs text-stone-400 mt-1">
          Ma voucher se duoc them vao noi dung email qua bien {"{{voucher_code}}"}
        </p>
      </div>

      {/* Scheduled at (optional) */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Gui theo lich{" "}
          <span className="text-xs text-stone-400 font-normal">(tuy chon — bo trong = gui ngay)</span>
        </label>
        <input
          type="datetime-local"
          value={formData.scheduled_at ? formData.scheduled_at.slice(0, 16) : ""}
          onChange={(e) =>
            handleChange("scheduled_at", e.target.value ? new Date(e.target.value).toISOString() : null)
          }
          min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
          className="w-full px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/owner/campaigns")}
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
            ? isEdit
              ? "Dang cap nhat..."
              : "Dang tao..."
            : isEdit
              ? "Cap nhat chien dich"
              : "Tao chien dich"}
        </button>
      </div>
    </form>
  );
}
