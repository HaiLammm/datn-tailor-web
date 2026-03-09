"use client";

/**
 * Sanity Check Dashboard Component
 * Story 4.2: Bảng đối soát Kỹ thuật cho Thợ may (Artisan Sanity Check Dashboard)
 *
 * Displays 3-column comparison table (Body | Base | Suggested)
 * with severity-based color coding and guardrail integration.
 *
 * AC#1: 3-column table with Vietnamese headers
 * AC#2: Color-coded severity (normal/warning/danger)
 * AC#3: Guardrail warnings inline
 * AC#4: Locked state display with geometry_hash
 * AC#5: Empty state when no data
 */

import React, { useState } from "react";
import type { SanityCheckRow, SanityCheckResponse, ConstraintViolation } from "@/types/geometry";

/** Heritage Gold color for positive deltas and overrides */
const HERITAGE_GOLD = "#D4AF37";

/** Severity styling configuration (Heritage Palette) */
const SEVERITY_STYLES = {
  normal: {
    bg: "transparent",
    text: "text-gray-700",
    border: "",
  },
  warning: {
    bg: "#FEF3C7",
    text: "#92400E",
    border: "",
  },
  danger: {
    bg: "#FEF2F2",
    text: "#991B1B",
    border: "border-red-300",
  },
};

interface SanityCheckDashboardProps {
  /** Sanity check response data from API */
  data: SanityCheckResponse | null;
  /** Loading state */
  isLoading?: boolean;
  /** Optional guardrail warnings to display inline */
  guardrailWarnings?: ConstraintViolation[];
  /** Optional guardrail violations to display inline */
  guardrailViolations?: ConstraintViolation[];

  /** Story 4.3: Manual Override - handler for saving an override */
  onOverride?: (deltaKey: string, value: number, reason?: string) => Promise<void>;
  /** Story 4.3: Map of existing overrides to display */
  overrides?: Record<string, { value: number; original: number }>;
  /** Story 4.3: Whether override editing is enabled for current user */
  isOverrideEnabled?: boolean;
}

/**
 * Format delta value with +/- sign and color
 */
function DeltaDisplay({ delta, unit }: { delta: number; unit: string }) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const colorClass = isPositive
    ? "text-green-600"
    : isNegative
      ? "text-red-600"
      : "text-gray-500";

  return (
    <span className={`font-mono text-sm ${colorClass}`}>
      {isPositive ? "+" : ""}
      {delta.toFixed(1)} {unit}
    </span>
  );
}

/**
 * Single row in the sanity check table
 */
function SanityCheckTableRow({
  row,
  guardrailMessage,
  isOverrideEnabled,
  overriddenData,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  isSubmitting,
  editValue,
  setEditValue,
  editReason,
  setEditReason,
  error,
}: {
  row: SanityCheckRow;
  guardrailMessage?: string;
  isOverrideEnabled?: boolean;
  overriddenData?: { value: number; original: number };
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  isSubmitting: boolean;
  editValue: string;
  setEditValue: (v: string) => void;
  editReason: string;
  setEditReason: (v: string) => void;
  error: string | null;
}) {
  const style = SEVERITY_STYLES[row.severity];
  const hasOverride = !!overriddenData;
  const displayValue = hasOverride ? overriddenData.value : row.suggested_value;
  const originalValue = hasOverride ? overriddenData.original : row.suggested_value;

  return (
    <>
      <tr
        data-testid={`sanity-row-${row.key}`}
        className={`border-b border-gray-200 transition-colors ${style.border} ${isEditing ? "ring-2 ring-inset ring-[#D4AF37] bg-amber-50" : ""}`}
        style={{ backgroundColor: !isEditing ? style.bg : undefined }}
      >
        <td className="px-4 py-3 font-medium" style={{ color: style.text !== "text-gray-700" ? style.text : undefined }}>
          {row.label_vi}
        </td>
        <td className="px-4 py-3 text-center font-mono">
          {row.body_value !== null ? `${row.body_value.toFixed(1)} ${row.unit}` : "—"}
        </td>
        <td className="px-4 py-3 text-center font-mono">
          {row.base_value.toFixed(1)} {row.unit}
        </td>
        <td className="px-4 py-3 text-center">
          {isEditing ? (
            <div className="flex flex-col gap-2 p-2">
              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-20 px-2 py-1 text-center font-mono border border-gray-300 rounded focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none"
                  autoFocus
                />
                <span className="text-sm text-gray-500">{row.unit}</span>
                <span className="text-xs text-gray-400 line-through">
                  {originalValue.toFixed(1)}
                </span>
              </div>
              <textarea
                placeholder="Lý do ghi đè..."
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full p-2 text-xs border border-gray-200 rounded resize-none h-12 outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
              {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
              <div className="flex justify-center gap-2">
                <button
                  onClick={onSaveEdit}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-[#D4AF37] text-white text-xs font-medium rounded hover:bg-amber-600 disabled:opacity-50"
                >
                  {isSubmitting ? "..." : "Lưu"}
                </button>
                <button
                  onClick={onCancelEdit}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded hover:bg-gray-200"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div 
              className={`flex flex-col items-center justify-center ${isOverrideEnabled ? "cursor-pointer hover:bg-black/5 rounded py-1" : ""}`}
              onClick={isOverrideEnabled ? onStartEdit : undefined}
              title={isOverrideEnabled ? "Nhấn để ghi đè thông số" : undefined}
            >
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${hasOverride ? "text-indigo-900" : ""}`}>
                  {displayValue.toFixed(1)} {row.unit}
                </span>
                {hasOverride && (
                  <span className="text-xs text-gray-400 line-through">
                    {overriddenData.original.toFixed(1)}
                  </span>
                )}
                <DeltaDisplay delta={displayValue - row.base_value} unit={row.unit} />
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {hasOverride && (
                  <span className="px-1.5 py-0.5 bg-[#D4AF37] text-white text-[10px] font-bold rounded uppercase tracking-wider">
                    Ghi đè
                  </span>
                )}
                {row.severity !== "normal" && !hasOverride && (
                  <span className="text-sm" aria-hidden="true">
                    {row.severity === "warning" ? "⚠️" : "🚨"}
                  </span>
                )}
              </div>
            </div>
          )}
        </td>
      </tr>
      {/* Inline guardrail message for this row */}
      {guardrailMessage && !isEditing && (
        <tr>
          <td colSpan={4} className="px-4 py-2">
            <div
              className="flex items-start gap-1.5 text-xs px-2 py-1.5 rounded-md"
              style={{
                backgroundColor: row.severity === "danger" ? "#FEF2F2" : "#FEF3C7",
                color: row.severity === "danger" ? "#991B1B" : "#92400E",
              }}
            >
              <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{guardrailMessage}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Lock status indicator
 */
function LockStatusBadge({
  isLocked,
  geometryHash,
}: {
  isLocked: boolean;
  geometryHash: string | null;
}) {
  if (!isLocked) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
          />
        </svg>
        <span>Chưa khóa thiết kế</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm" style={{ color: HERITAGE_GOLD }}>
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clipRule="evenodd"
        />
      </svg>
      <span className="font-medium">Đã khóa</span>
      {geometryHash && (
        <span className="font-mono text-xs text-gray-400 truncate max-w-[100px]">
          {geometryHash.slice(0, 12)}...
        </span>
      )}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div
      data-testid="sanity-check-empty"
      className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200"
    >
      <svg
        className="w-12 h-12 mx-auto text-gray-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-700 mb-2">
        Chưa có thiết kế để đối soát
      </h3>
      <p className="text-gray-500 text-sm">
        Vui lòng tạo bản vẽ trước.
      </p>
    </div>
  );
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 rounded mb-4" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded mb-2" />
      ))}
    </div>
  );
}

/**
 * Sanity Check Dashboard
 *
 * Main component displaying the 3-column comparison table for Tailors.
 * Now supports manual overrides for artisans (Story 4.3).
 */
export function SanityCheckDashboard({
  data,
  isLoading = false,
  guardrailWarnings = [],
  guardrailViolations = [],
  onOverride,
  overrides = {},
  isOverrideEnabled = false,
}: SanityCheckDashboardProps) {
  // --- Story 4.3: Local state for manual override editing ---
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const startEditing = (row: SanityCheckRow) => {
    const currentVal = overrides[row.key] ? overrides[row.key].value : row.suggested_value;
    setEditingKey(row.key);
    setEditValue(currentVal.toFixed(1));
    setEditReason("");
    setOverrideError(null);
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditValue("");
    setEditReason("");
    setOverrideError(null);
  };

  const handleSaveOverride = async (deltaKey: string) => {
    if (!onOverride) return;

    const val = parseFloat(editValue);
    if (isNaN(val)) {
      setOverrideError("Vui lòng nhập số hợp lệ");
      return;
    }

    setIsSubmitting(true);
    setOverrideError(null);

    try {
      await onOverride(deltaKey, val, editReason);
      setEditingKey(null);
    } catch (err: any) {
      setOverrideError(err.message || "Không thể lưu ghi đè");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build guardrail message lookup by key
  const guardrailMessagesByKey: Record<string, string> = {};
  
  for (const warning of guardrailWarnings) {
    for (const key of Object.keys(warning.violated_values)) {
      guardrailMessagesByKey[key] = warning.message_vi;
    }
  }
  
  for (const violation of guardrailViolations) {
    for (const key of Object.keys(violation.violated_values)) {
      guardrailMessagesByKey[key] = violation.message_vi;
    }
  }

  if (isLoading) {
    return (
      <div data-testid="sanity-check-loading" className="bg-white rounded-xl border border-gray-200 p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      id="sanity-check-dashboard"
      data-testid="sanity-check-dashboard"
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Bảng đối soát kỹ thuật
        </h3>
        <LockStatusBadge isLocked={data.is_locked} geometryHash={data.geometry_hash} />
      </div>

      {/* Guardrail status banner */}
      {data.guardrail_status && data.guardrail_status !== "passed" && (
        <div
          className="px-6 py-3 flex items-center gap-2 text-sm"
          style={{
            backgroundColor: data.guardrail_status === "rejected" ? "#FEF2F2" : "#FEF3C7",
            color: data.guardrail_status === "rejected" ? "#991B1B" : "#92400E",
          }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            {data.guardrail_status === "rejected"
              ? "Vi phạm ràng buộc vật lý"
              : "Cảnh báo ràng buộc kỹ thuật"}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Thông số
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                Số đo khách
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                Mẫu chuẩn
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                Đề xuất AI
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <SanityCheckTableRow
                key={row.key}
                row={row}
                guardrailMessage={guardrailMessagesByKey[row.key]}
                isOverrideEnabled={isOverrideEnabled && !data.is_locked}
                overriddenData={overrides[row.key]}
                isEditing={editingKey === row.key}
                onStartEdit={() => startEditing(row)}
                onCancelEdit={cancelEditing}
                onSaveEdit={() => handleSaveOverride(row.key)}
                isSubmitting={isSubmitting}
                editValue={editValue}
                setEditValue={setEditValue}
                editReason={editReason}
                setEditReason={setEditReason}
                error={overrideError}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer legend */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#FEF3C7" }} />
            <span>Chênh lệch vừa (2-5cm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border border-red-300" style={{ backgroundColor: "#FEF2F2" }} />
            <span>Chênh lệch lớn (≥5cm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-green-600 font-mono">+X.X</span>
            <span>Tăng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-red-600 font-mono">-X.X</span>
            <span>Giảm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 bg-[#D4AF37] text-white text-[10px] font-bold rounded uppercase">Ghi đè</span>
            <span>Điều chỉnh thủ công</span>
          </div>
        </div>
      </div>
    </div>
  );
}
