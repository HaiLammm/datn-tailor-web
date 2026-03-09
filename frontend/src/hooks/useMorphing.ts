"use client";

/**
 * useMorphing Hook - Story 3.2
 *
 * Uses requestAnimationFrame to drive real-time SVG path morphing.
 * Directly manipulates DOM `d` attributes for 60fps performance (AC2, AC4).
 *
 * Strategy: "Transient State" — slider drags update DOM directly,
 * only committing to React State on pointer release (AC5).
 */

import { useRef, useCallback, useEffect, useMemo } from "react";
import type { MasterGeometry, MorphDelta, Segment, MorphDeltaSegment } from "@/types/geometry";
import { lerpSegments } from "@/utils/geometry";

/** Build SVG `d` attribute string from segments. */
function segmentsToD(segments: Segment[], closed: boolean): string {
  let d = segments
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

  if (closed) d += " Z";
  return d;
}

interface UseMorphingOptions {
  baseGeometry: MasterGeometry | null;
  morphDelta: MorphDelta | null;
}

interface UseMorphingReturn {
  /** Ref to attach to the SVG container <g> or <svg> element */
  svgContainerRef: React.RefObject<SVGElement | null>;
  /** Call on every slider change (real-time, drives animation) */
  updateAlpha: (alpha: number) => void;
  /** Current alpha for reference (not React state — read from ref) */
  alphaRef: React.RefObject<number>;
}

export function useMorphing({
  baseGeometry,
  morphDelta,
}: UseMorphingOptions): UseMorphingReturn {
  const svgContainerRef = useRef<SVGElement | null>(null);
  const alphaRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);

  // Pre-compute mappings for O(1) lookup during animation loop
  // Map<pathId, { baseSegments, deltaSegments, closed }>
  const pathMappings = useMemo(() => {
    const map = new Map<string, { base: Segment[]; delta: MorphDeltaSegment[]; closed: boolean }>();

    if (!baseGeometry || !morphDelta) return map;

    for (let i = 0; i < baseGeometry.parts.length; i++) {
      const basePart = baseGeometry.parts[i];
      const deltaPart = morphDelta.parts[i]; 

      if (!deltaPart) continue;

      for (let j = 0; j < basePart.paths.length; j++) {
        const basePath = basePart.paths[j];
        const deltaPath = deltaPart.paths[j];

        if (basePath && deltaPath && basePath.id === deltaPath.path_id) {
             map.set(basePath.id, {
                 base: basePath.segments,
                 delta: deltaPath.segments,
                 closed: basePath.closed
             });
        }
      }
    }
    return map;
  }, [baseGeometry, morphDelta]);

  // Store mappings in a ref so the callback can access the latest without dependency changes causing re-creation of callback
  const mappingsRef = useRef(pathMappings);
  useEffect(() => {
    mappingsRef.current = pathMappings;
  }, [pathMappings]);


  const applyMorph = useCallback((alpha: number) => {
    const container = svgContainerRef.current;
    const mappings = mappingsRef.current;

    if (!container || mappings.size === 0) return;

    // Walk each <path> element in the container
    // If it has a data-morph-id, look it up in mappings
    const pathElements = container.querySelectorAll("path[data-morph-id]");

    for (const pathEl of pathElements) {
      const morphId = pathEl.getAttribute("data-morph-id");
      if (!morphId) continue;

      const mapping = mappings.get(morphId);
      if (!mapping) continue;

      const morphedSegments = lerpSegments(
        mapping.base,
        mapping.delta,
        alpha
      );
      
      const d = segmentsToD(morphedSegments, mapping.closed);
      pathEl.setAttribute("d", d);
    }
  }, []);

  const updateAlpha = useCallback(
    (alpha: number) => {
      alphaRef.current = alpha;

      // Cancel any pending frame to avoid stacking
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        applyMorph(alpha);
      });
    },
    [applyMorph]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    svgContainerRef,
    updateAlpha,
    alphaRef,
  };
}
