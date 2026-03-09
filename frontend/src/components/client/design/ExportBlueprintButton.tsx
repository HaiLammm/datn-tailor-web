"use client";

/**
 * Export Blueprint Button Component
 * Story 4.4: Xuất bản vẽ sản xuất (Manufacturing Blueprint & DXF/SVG Export)
 *
 * Provides actions to export the locked design as SVG or DXF.
 * Includes loading states and error handling for guardrail violations.
 * AC3: On guardrail failure, scrolls to Sanity Check Dashboard for review.
 */

import React, { useState } from "react";
import { exportBlueprint } from "@/app/actions/geometry-actions";
import { ExportFormat } from "@/types/geometry";

interface ExportBlueprintButtonProps {
  /** Design UUID to export */
  designId: string;
  /** Whether the design is currently locked */
  isLocked: boolean;
  /** Callback when guardrail violations occur during export */
  onError?: (error: string, violations?: any[]) => void;
}

/** Heritage Gold color for primary actions */
const HERITAGE_GOLD = "#D4AF37";

export function ExportBlueprintButton({
  designId,
  isLocked,
  onError,
}: ExportBlueprintButtonProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: ExportFormat) => {
    if (!isLocked) return;

    setIsExporting(format);
    setError(null);

    try {
      const result = await exportBlueprint(designId, format);

      if (result.success && result.data && result.filename) {
        // Trigger browser download
        const mimeType = format === "svg" ? "image/svg+xml" : "application/dxf";
        const link = document.createElement("a");
        link.href = `data:${mimeType};base64,${result.data}`;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const errorMsg = result.error || "Không thể xuất bản vẽ.";
        setError(errorMsg);

        // AC3: Scroll to Sanity Check Dashboard for guardrail review
        if (result.violations && result.violations.length > 0) {
          const dashboard = document.getElementById("sanity-check-dashboard");
          if (dashboard) {
            dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }

        if (onError) {
          onError(errorMsg, result.violations);
        }
      }
    } catch (err) {
      const errorMsg = "Lỗi kết nối khi xuất bản vẽ.";
      setError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setIsExporting(null);
    }
  };

  if (!isLocked) {
    return (
      <div className="text-sm text-gray-400 italic bg-gray-50 px-4 py-3 rounded-lg border border-dashed border-gray-300">
        Khóa thiết kế để xuất bản vẽ sản xuất
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          onClick={() => handleExport("svg")}
          disabled={!!isExporting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-[#D4AF37] border border-[#D4AF37] rounded-lg font-medium hover:bg-amber-50 disabled:opacity-50 transition-colors"
          title="Xuất file vector SVG để xem hoặc in ấn"
        >
          {isExporting === "svg" ? (
            <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          <span>Xuất SVG</span>
        </button>

        <button
          onClick={() => handleExport("dxf")}
          disabled={!!isExporting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#D4AF37] text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm"
          title="Xuất file CAD DXF cho máy cắt hoặc phần mềm kỹ thuật"
        >
          {isExporting === "dxf" ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          <span>Xuất DXF</span>
        </button>
      </div>
      
      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-start gap-2">
           <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <span>{error}</span>
            {error.includes("quy tắc vàng") && (
              <p className="mt-1 text-gray-500">Vui lòng kiểm tra Bảng đối soát kỹ thuật bên dưới.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
