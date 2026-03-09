"use client";

/**
 * Adaptive Canvas Component
 * Story 3.1: Adaptive Canvas & Khởi tạo Rập chuẩn
 * Story 3.2: Real-time morphing via useMorphing hook
 *
 * Renders the baseline SVG pattern from backend geometry data.
 * Uses Heritage Palette: Indigo Depth stroke, Silk Ivory fill, Heritage Gold background.
 *
 * Performance target: First paint < 200ms (AC4).
 * Morphing target: < 200ms latency, 60fps (AC2).
 */

import React, { memo, useCallback, useMemo } from "react";
import { useDesignStore } from "@/store/designStore";
import { useAutoFit } from "@/hooks/useAutoFit";
import { useMorphing } from "@/hooks/useMorphing";
import { SvgPattern } from "./SvgPattern";
import { ComparisonOverlay } from "./ComparisonOverlay";
import { DeltaStatsPanel } from "./DeltaStatsPanel";
import { computeDeltaStats } from "@/utils/geometry";
import type { MorphDelta } from "@/types/geometry";

interface AdaptiveCanvasProps {
  width?: number;
  height?: number;
  /** Story 3.2: Preloaded morph delta for current style */
  morphDelta?: MorphDelta | null;
}

/**
 * Adaptive Canvas - SVG Pattern Renderer
 *
 * Features:
 * - Display baseline SVG pattern from backend
 * - Auto-fit viewBox to center pattern
 * - Heritage Palette visual styling
 * - Placeholder when no pillar selected
 */
export const AdaptiveCanvas = memo(function AdaptiveCanvas({
  height = 400,
  morphDelta = null,
}: AdaptiveCanvasProps) {
  const { selected_pillar, is_pillar_selected, is_comparison_mode, toggleComparisonMode } = useDesignStore();
  const currentPattern = useDesignStore((state) => state.current_pattern);

  // Calculate viewBox from geometry (AC1: centered and scaled)
  const viewBox = useAutoFit(currentPattern, 20);

  // Story 3.2: Morphing engine — direct DOM manipulation for 60fps (AC2, AC4)
  const { svgContainerRef, updateAlpha, alphaRef } = useMorphing({
    baseGeometry: currentPattern,
    morphDelta,
  });

  // Expose updateAlpha for parent components to call from slider events
  // This is stored on the component instance via the exported ref pattern
  const handleMorphUpdate = useCallback(
    (alpha: number) => {
      updateAlpha(alpha);
    },
    [updateAlpha]
  );

  // Attach handleMorphUpdate to window for cross-component access
  // (Alternative: lift to parent or use context — kept simple for now)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__morphUpdateAlpha = handleMorphUpdate;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as unknown as Record<string, unknown>).__morphUpdateAlpha;
      }
    };
  }, [handleMorphUpdate]);

  const hasPattern = currentPattern && currentPattern.parts.length > 0;

  // Story 3.3 AC3: Compute delta statistics for comparison overlay
  const deltaStats = useMemo(() => {
    if (!morphDelta) return { totalChangedPoints: 0, avgDelta: 0, maxDelta: 0 };
    return computeDeltaStats(morphDelta, alphaRef.current);
  }, [morphDelta, alphaRef]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Canvas header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Bản vẽ Thiết kế</h3>
        <div className="flex items-center gap-2">
          {/* Story 3.3: Comparison Mode Toggle */}
          {hasPattern && (
            <button
              onClick={toggleComparisonMode}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                is_comparison_mode
                  ? "bg-indigo-100 text-indigo-700 font-medium"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              title="So sánh với rập chuẩn"
            >
              So sánh
            </button>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500 ml-2">
            <span
              className={`w-2 h-2 rounded-full ${hasPattern ? "bg-green-500" : "bg-amber-400"}`}
            />
            {hasPattern ? "Sẵn sàng" : "Đang tải..."}
          </div>
        </div>
      </div>

      {/* Canvas area - Heritage Gold background (AC3) */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: "100%",
          height,
          backgroundColor: "#FFFBF0", // Heritage Gold light variant
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.05) 0%, transparent 70%)",
        }}
      >
        {!is_pillar_selected && !hasPattern ? (
          // No pillar selected state
          <div className="text-center p-8">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-500">
              Chọn phong cách để xem bản vẽ thiết kế
            </p>
          </div>
        ) : hasPattern ? (
          // Render actual baseline pattern from backend (AC1, AC2, AC3)
          <svg
            width="100%"
            height="100%"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="drop-shadow-sm"
            role="img"
            aria-label="Bản vẽ rập chuẩn"
          >
            {/* Background fill - Silk Ivory (AC3) */}
            <rect
              x={viewBox.x}
              y={viewBox.y}
              width={viewBox.width}
              height={viewBox.height}
              fill="#FDFCF5"
              opacity="0.5"
            />

            {/* Story 3.3: Comparison Overlay — always in DOM, CSS visibility toggle (AC4) */}
            <ComparisonOverlay
              geometry={currentPattern}
              visible={is_comparison_mode}
            />

            {/* Render all pattern parts - Main Morphing Layer */}
            {/* Attach ref to Group instead of SVG to scope morphing updates */}
            <g ref={svgContainerRef as React.RefObject<SVGGElement>}>
              {currentPattern.parts.map((part) => (
                <g key={part.part_id} data-part-name={part.name}>
                  <SvgPattern
                    paths={part.paths}
                    fill="fill-transparent"
                    stroke="stroke-indigo-600"
                  />
                </g>
              ))}
            </g>
          </svg>
        ) : (
          // Loading state (pillar selected but no pattern yet)
          <div className="text-center p-8">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-gray-500">Đang tải bản vẽ...</p>
          </div>
        )}

        {/* Info overlay when pattern is loaded */}
        {hasPattern && selected_pillar && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between text-gray-600">
              <span>Phong cách: {selected_pillar.name}</span>
              <span className="text-indigo-600 font-medium">
                {currentPattern.parts.length} chi tiết rập
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Story 3.3 AC3: Delta statistics panel */}
      <DeltaStatsPanel
        stats={deltaStats}
        visible={is_comparison_mode && hasPattern === true}
      />

      {/* Canvas footer - zoom controls placeholder */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="p-1.5 text-gray-400 rounded hover:bg-gray-200 disabled:opacity-50"
            aria-label="Phóng to"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </button>
          <span className="text-xs text-gray-400">100%</span>
          <button
            type="button"
            disabled
            className="p-1.5 text-gray-400 rounded hover:bg-gray-200 disabled:opacity-50"
            aria-label="Thu nhỏ"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
              />
            </svg>
          </button>
        </div>
        <span className="text-xs text-gray-400">
          {currentPattern?.units || "mm"} | v{currentPattern?.version || "1.0"}
        </span>
      </div>
    </div>
  );
});
