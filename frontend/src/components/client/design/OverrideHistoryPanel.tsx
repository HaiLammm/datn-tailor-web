"use client";

/**
 * Override History Panel Component
 * Story 4.3: Ghi đè & Phản hồi từ Nghệ nhân (Manual Override & Feedback Loop)
 *
 * Displays a list of manual overrides performed on a design.
 * AC#6: Hiển thị danh sách các override: thông số, giá trị gốc, giá trị mới, lý do, thợ may, thời gian.
 */

import React, { useState } from "react";
import { OverrideHistoryItem } from "@/types/override";

interface OverrideHistoryPanelProps {
  /** List of override history items */
  overrides: OverrideHistoryItem[];
  /** Loading state */
  isLoading?: boolean;
}

/** Heritage Gold accent color */
const HERITAGE_GOLD = "#D4AF37";

/**
 * Format date to Vietnamese locale
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OverrideHistoryPanel({
  overrides,
  isLoading = false,
}: OverrideHistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (overrides.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
        <p className="text-sm">Chưa có ghi đè nào cho thiết kế này.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header / Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: HERITAGE_GOLD }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">
              Lịch sử ghi đè ({overrides.length})
            </h3>
            <p className="text-xs text-gray-500">Xem các điều chỉnh thủ công từ thợ may</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {overrides.map((item) => (
              <li key={item.id} className="px-6 py-4 hover:bg-black/[0.01]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-gray-900">{item.label_vi}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 line-through">{item.original_value.toFixed(1)} cm</span>
                      <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="font-mono font-bold text-indigo-600 px-1.5 py-0.5 bg-indigo-50 rounded">
                        {item.overridden_value.toFixed(1)} cm
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block">{formatDate(item.created_at)}</span>
                    <span className="text-xs font-medium text-gray-600 block mt-0.5">bởi {item.tailor_name}</span>
                  </div>
                </div>
                
                {item.reason_vi && (
                  <div className="mt-2 p-2 bg-amber-50 rounded border-l-2 border-[#D4AF37] text-xs text-amber-900 italic">
                    "{item.reason_vi}"
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
