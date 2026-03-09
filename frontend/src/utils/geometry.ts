/**
 * Geometry utilities for Story 3.2: Real-time pattern morphing.
 *
 * Implements the formula: P_final = P_base + alpha * MorphDelta
 * where alpha is the slider value (0.0 - 1.0).
 */

import type {
  Point,
  Segment,
  CurveControl,
  MasterGeometry,
  MorphDelta,
  MorphDeltaSegment,
} from "@/types/geometry";

/**
 * Delta statistics for comparison overlay (Story 3.3).
 */
export interface DeltaStats {
  totalChangedPoints: number;
  avgDelta: number;
  maxDelta: number;
}

/**
 * Compute interpolated point: P_base + alpha * (dx, dy).
 */
export function lerpPoint(
  base: Point,
  dx: number,
  dy: number,
  alpha: number
): Point {
  return {
    x: base.x + alpha * dx,
    y: base.y + alpha * dy,
  };
}

/**
 * Apply morph delta to a list of segments at given alpha.
 */
export function lerpSegments(
  baseSegments: Segment[],
  deltaSegments: MorphDeltaSegment[],
  alpha: number
): Segment[] {
  return baseSegments.map((seg, i) => {
    const delta = deltaSegments[i];
    const newTo = lerpPoint(seg.to, delta.dx, delta.dy, alpha);

    let newControl: CurveControl | undefined | null = seg.control;

    if (seg.control && delta.cp1_dx != null && delta.cp1_dy != null) {
      const newCp1 = lerpPoint(
        seg.control.cp1,
        delta.cp1_dx,
        delta.cp1_dy,
        alpha
      );

      let newCp2: Point | undefined | null = seg.control.cp2;
      if (
        seg.control.cp2 &&
        delta.cp2_dx != null &&
        delta.cp2_dy != null
      ) {
        newCp2 = lerpPoint(seg.control.cp2, delta.cp2_dx, delta.cp2_dy, alpha);
      }

      newControl = { cp1: newCp1, cp2: newCp2 };
    }

    return {
      type: seg.type,
      to: newTo,
      control: newControl,
    };
  });
}

/**
 * Compute delta statistics between base and morphed pattern (Story 3.3 AC3).
 *
 * Formula: deltaDistance = sqrt((alpha*dx)² + (alpha*dy)²)
 * A point is "changed" if deltaDistance > 0.1mm threshold.
 */
export function computeDeltaStats(
  delta: MorphDelta,
  alpha: number
): DeltaStats {
  const distances: number[] = [];

  for (const part of delta.parts) {
    for (const path of part.paths) {
      for (const seg of path.segments) {
        const dist = Math.sqrt(
          (alpha * seg.dx) ** 2 + (alpha * seg.dy) ** 2
        );
        distances.push(dist);
      }
    }
  }

  if (distances.length === 0) {
    return { totalChangedPoints: 0, avgDelta: 0, maxDelta: 0 };
  }

  const totalChangedPoints = distances.filter((d) => d > 0.1).length;
  const avgDelta =
    distances.reduce((sum, d) => sum + d, 0) / distances.length;
  const maxDelta = Math.max(...distances);

  return { totalChangedPoints, avgDelta, maxDelta };
}

/**
 * Apply full MorphDelta to a MasterGeometry at given alpha.
 * Returns a new MasterGeometry with interpolated points.
 */
export function applyMorphDelta(
  base: MasterGeometry,
  delta: MorphDelta,
  alpha: number
): MasterGeometry {
  return {
    ...base,
    parts: base.parts.map((part, partIdx) => {
      const deltaPart = delta.parts[partIdx];
      return {
        ...part,
        paths: part.paths.map((path, pathIdx) => {
          const deltaPath = deltaPart.paths[pathIdx];
          return {
            ...path,
            segments: lerpSegments(path.segments, deltaPath.segments, alpha),
          };
        }),
      };
    }),
  };
}
