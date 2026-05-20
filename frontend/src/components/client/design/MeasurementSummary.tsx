"use client";

import type { ReactNode } from "react";

import {
  PATTERN_MEASUREMENT_FIELDS,
  PATTERN_SESSION_STATUS_LABELS,
  type PatternSessionResponse,
} from "@/types/pattern";

interface MeasurementSummaryProps {
  session: PatternSessionResponse;
  customerName?: string | null;
  isGenerating?: boolean;
  onGenerate?: () => void;
  children?: ReactNode;
}

const STATUS_STYLES: Record<PatternSessionResponse["status"], string> = {
  draft: "bg-gray-100 text-gray-700",
  completed: "bg-green-100 text-green-700",
  exported: "bg-blue-100 text-blue-700",
};

const GARMENT_TYPE_LABELS: Record<string, string> = {
  ao_dai: "Áo dài",
};

function formatMeasurementValue(value: number) {
  return `${value.toFixed(1)} cm`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function MeasurementSummary({
  session,
  customerName,
  isGenerating = false,
  onGenerate,
  children,
}: MeasurementSummaryProps) {
  const customerLabel = customerName?.trim() || (session.customer_id ? "Khách hàng liên kết" : "Nhập thủ công");

  return (
    <section className="space-y-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-900/70">
              Phiên thiết kế
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[#1A2B4C]">Xem mẫu rập</h1>
            <p className="mt-1 text-sm text-stone-500">Kiểm tra số đo và bản xem trước trước khi xuất file.</p>
          </div>

          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[session.status]}`}
          >
            {PATTERN_SESSION_STATUS_LABELS[session.status]}
          </span>
        </div>

        <div className="grid gap-3 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Khách hàng</p>
            <p className="mt-1 font-medium text-stone-900">{customerLabel}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Loại trang phục</p>
            <p className="mt-1 font-medium text-stone-900">
              {GARMENT_TYPE_LABELS[session.garment_type] ?? session.garment_type}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Ngày tạo</p>
            <p className="mt-1 font-medium text-stone-900">{formatDateTime(session.created_at)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Mã phiên</p>
            <p className="mt-1 truncate font-mono text-xs text-stone-700">{session.id}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Tóm tắt số đo</h2>
          <span className="text-xs text-stone-400">10 chỉ số</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {PATTERN_MEASUREMENT_FIELDS.map((field) => {
            const value = session[field.key];
            return (
              <div key={field.key} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-sm text-stone-500">{field.label}</p>
                <p className="mt-1 font-mono text-lg font-semibold text-[#1A2B4C]">
                  {formatMeasurementValue(value)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {session.notes ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Ghi chú</p>
          <p className="mt-1 whitespace-pre-wrap">{session.notes}</p>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-stone-200 pt-4">
        {session.status === "draft" && onGenerate ? (
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1A2B4C] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#16233d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? "Đang tạo mẫu rập..." : "Tạo mẫu"}
          </button>
        ) : null}

        {children}
      </div>
    </section>
  );
}
