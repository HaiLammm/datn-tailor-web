/**
 * Unit Tests for computeDeltaStats - Story 3.3 AC3
 *
 * Tests:
 * - Zero delta (alpha=0 or all deltas zero)
 * - Uniform delta (all segments same displacement)
 * - Mixed delta (varying displacements)
 * - Partial alpha (fractional slider position)
 */

import { describe, it, expect } from "@jest/globals";
import { computeDeltaStats } from "@/utils/geometry";
import type { MorphDelta } from "@/types/geometry";

const makeDelta = (
  segments: Array<{ dx: number; dy: number }>
): MorphDelta => ({
  style_id: "test-style",
  parts: [
    {
      part_id: "part-1",
      paths: [
        {
          path_id: "path-1",
          segments: segments.map((s) => ({ dx: s.dx, dy: s.dy })),
        },
      ],
    },
  ],
});

describe("computeDeltaStats", () => {
  it("returns zeros when alpha is 0", () => {
    const delta = makeDelta([
      { dx: 10, dy: 0 },
      { dx: 0, dy: 5 },
    ]);
    const stats = computeDeltaStats(delta, 0);
    expect(stats.totalChangedPoints).toBe(0);
    expect(stats.avgDelta).toBe(0);
    expect(stats.maxDelta).toBe(0);
  });

  it("returns zeros when all deltas are zero", () => {
    const delta = makeDelta([
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
    ]);
    const stats = computeDeltaStats(delta, 1);
    expect(stats.totalChangedPoints).toBe(0);
    expect(stats.avgDelta).toBe(0);
    expect(stats.maxDelta).toBe(0);
  });

  it("computes correct stats for uniform delta", () => {
    // All segments have dx=3, dy=4 → distance = 5 each at alpha=1
    const delta = makeDelta([
      { dx: 3, dy: 4 },
      { dx: 3, dy: 4 },
      { dx: 3, dy: 4 },
    ]);
    const stats = computeDeltaStats(delta, 1);
    expect(stats.totalChangedPoints).toBe(3);
    expect(stats.avgDelta).toBeCloseTo(5.0);
    expect(stats.maxDelta).toBeCloseTo(5.0);
  });

  it("computes correct stats for mixed delta", () => {
    // seg1: dx=3, dy=4 → dist=5
    // seg2: dx=0, dy=0 → dist=0 (not changed)
    // seg3: dx=6, dy=8 → dist=10
    const delta = makeDelta([
      { dx: 3, dy: 4 },
      { dx: 0, dy: 0 },
      { dx: 6, dy: 8 },
    ]);
    const stats = computeDeltaStats(delta, 1);
    expect(stats.totalChangedPoints).toBe(2); // only 2 > 0.1
    expect(stats.avgDelta).toBeCloseTo(5.0); // (5+0+10)/3
    expect(stats.maxDelta).toBeCloseTo(10.0);
  });

  it("scales correctly with partial alpha", () => {
    // dx=10, dy=0 → at alpha=0.5 → distance = 5
    const delta = makeDelta([{ dx: 10, dy: 0 }]);
    const stats = computeDeltaStats(delta, 0.5);
    expect(stats.totalChangedPoints).toBe(1);
    expect(stats.avgDelta).toBeCloseTo(5.0);
    expect(stats.maxDelta).toBeCloseTo(5.0);
  });

  it("handles empty delta parts", () => {
    const delta: MorphDelta = { style_id: "test", parts: [] };
    const stats = computeDeltaStats(delta, 1);
    expect(stats.totalChangedPoints).toBe(0);
    expect(stats.avgDelta).toBe(0);
    expect(stats.maxDelta).toBe(0);
  });

  it("counts points below threshold as unchanged", () => {
    // dx=0.05, dy=0.05 → dist=~0.0707 < 0.1 threshold
    const delta = makeDelta([{ dx: 0.05, dy: 0.05 }]);
    const stats = computeDeltaStats(delta, 1);
    expect(stats.totalChangedPoints).toBe(0);
    expect(stats.avgDelta).toBeGreaterThan(0);
  });
});
