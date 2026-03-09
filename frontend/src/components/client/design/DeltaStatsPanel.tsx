"use client";

/**
 * Delta Statistics Panel - Story 3.3 AC3
 *
 * Displays delta statistics (ΔG) when comparison mode is active:
 * - Total changed points
 * - Average delta (mm)
 * - Max delta (mm)
 */

import React from "react";
import type { DeltaStats } from "@/utils/geometry";

interface DeltaStatsPanelProps {
  stats: DeltaStats;
  visible: boolean;
}

export const DeltaStatsPanel: React.FC<DeltaStatsPanelProps> = ({
  stats,
  visible,
}) => {
  if (!visible) return null;

  return (
    <div
      data-testid="delta-stats-panel"
      className="px-4 py-2 bg-gray-50 border-t border-gray-200"
    >
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span className="font-medium" style={{ color: "#D4AF37" }}>
          ΔG
        </span>
        <span>
          Điểm thay đổi:{" "}
          <span className="font-medium" style={{ color: "#D4AF37" }}>
            {stats.totalChangedPoints}
          </span>
        </span>
        <span>
          Δ TB:{" "}
          <span className="font-medium" style={{ color: "#D4AF37" }}>
            {stats.avgDelta.toFixed(1)}mm
          </span>
        </span>
        <span>
          Δ Max:{" "}
          <span className="font-medium" style={{ color: "#D4AF37" }}>
            {stats.maxDelta.toFixed(1)}mm
          </span>
        </span>
      </div>
    </div>
  );
};
