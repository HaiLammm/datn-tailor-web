"use client";

/**
 * Comparison Overlay Component - Story 3.3
 *
 * Renders the baseline pattern (P_base) as a semi-transparent overlay
 * with Heritage Gold dashed stroke for visual comparison.
 *
 * Key design decisions:
 * - NO data-morph-id on paths → morphing hook ignores overlay
 * - CSS visibility toggle → no React re-render (AC4 < 200ms)
 * - Same SVG coordinate system → perfect alignment
 */

import React from "react";
import type { MasterGeometry } from "@/types/geometry";

interface ComparisonOverlayProps {
  geometry: MasterGeometry;
  visible: boolean;
}

export const ComparisonOverlay: React.FC<ComparisonOverlayProps> = ({
  geometry,
  visible,
}) => {
  return (
    <g
      data-testid="comparison-overlay"
      style={{ visibility: visible ? "visible" : "hidden" }}
      opacity={0.5}
      aria-hidden={!visible}
    >
      {geometry.parts.map((part) =>
        part.paths.map((path) => {
          let d = path.segments
            .map((seg) => {
              const { to, type, control } = seg;
              switch (type) {
                case "move":
                  return `M ${to.x} ${to.y}`;
                case "line":
                  return `L ${to.x} ${to.y}`;
                case "curve":
                  if (control) {
                    if (control.cp2) {
                      return `C ${control.cp1.x} ${control.cp1.y}, ${control.cp2.x} ${control.cp2.y}, ${to.x} ${to.y}`;
                    }
                    return `Q ${control.cp1.x} ${control.cp1.y}, ${to.x} ${to.y}`;
                  }
                  return `L ${to.x} ${to.y}`;
                default:
                  return "";
              }
            })
            .join(" ");

          if (path.closed) d += " Z";

          return (
            <path
              key={`overlay-${path.id}`}
              d={d}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="1.5"
              strokeDasharray="8 4"
              vectorEffect="non-scaling-stroke"
            />
          );
        })
      )}
    </g>
  );
};
