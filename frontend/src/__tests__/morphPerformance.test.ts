/**
 * Story 3.2 Task 4.2: Performance Test for Morphing
 *
 * Validates that the geometry interpolation math is fast enough
 * for 60fps rendering (< 16.6ms per frame).
 */

import { applyMorphDelta, lerpSegments } from "@/utils/geometry";
import type { MasterGeometry, MorphDelta, Segment, MorphDeltaSegment } from "@/types/geometry";

/**
 * Generate a complex geometry with many segments (simulating real pattern).
 */
function generateComplexGeometry(segmentCount: number): {
  base: MasterGeometry;
  delta: MorphDelta;
} {
  const segments: Segment[] = [
    { type: "move", to: { x: 0, y: 0 } },
  ];
  const deltaSegments: MorphDeltaSegment[] = [{ dx: 0, dy: 0 }];

  for (let i = 1; i < segmentCount; i++) {
    const useCurve = i % 3 === 0;
    if (useCurve) {
      segments.push({
        type: "curve",
        to: { x: i * 10, y: i * 5 },
        control: {
          cp1: { x: i * 10 - 5, y: i * 5 + 3 },
          cp2: { x: i * 10 + 2, y: i * 5 - 2 },
        },
      });
      deltaSegments.push({
        dx: i * 0.1,
        dy: i * 0.05,
        cp1_dx: 0.5,
        cp1_dy: 0.3,
        cp2_dx: 0.2,
        cp2_dy: 0.4,
      });
    } else {
      segments.push({
        type: "line",
        to: { x: i * 10, y: i * 5 },
      });
      deltaSegments.push({ dx: i * 0.1, dy: i * 0.05 });
    }
  }

  return {
    base: {
      parts: [
        {
          part_id: "complex",
          name: "Complex Part",
          paths: [{ id: "path_1", segments, closed: true }],
        },
        {
          part_id: "complex_2",
          name: "Complex Part 2",
          paths: [{ id: "path_2", segments: [...segments], closed: true }],
        },
        {
          part_id: "complex_3",
          name: "Complex Part 3",
          paths: [{ id: "path_3", segments: [...segments], closed: false }],
        },
      ],
      version: "1.0",
      units: "mm",
    },
    delta: {
      parts: [
        {
          part_id: "complex",
          paths: [{ path_id: "path_1", segments: deltaSegments }],
        },
        {
          part_id: "complex_2",
          paths: [{ path_id: "path_2", segments: [...deltaSegments] }],
        },
        {
          part_id: "complex_3",
          paths: [{ path_id: "path_3", segments: [...deltaSegments] }],
        },
      ],
      style_id: "perf_test",
    },
  };
}

describe("Morphing Performance (AC2: 60fps = < 16.6ms per frame)", () => {
  it("interpolates 100 segments in under 5ms", () => {
    const { base, delta } = generateComplexGeometry(100);

    const start = performance.now();
    for (let i = 0; i < 60; i++) {
      // Simulate 60 frames
      applyMorphDelta(base, delta, i / 60);
    }
    const elapsed = performance.now() - start;
    const perFrame = elapsed / 60;

    // Each frame should take < 5ms (well within 16.6ms budget)
    expect(perFrame).toBeLessThan(5);
  });

  it("interpolates 50 segments per path (realistic) in under 2ms", () => {
    const { base, delta } = generateComplexGeometry(50);

    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      applyMorphDelta(base, delta, Math.random());
    }
    const elapsed = performance.now() - start;
    const perCall = elapsed / iterations;

    expect(perCall).toBeLessThan(2);
  });

  it("lerpSegments handles rapid successive calls without accumulation", () => {
    const segments: Segment[] = Array.from({ length: 30 }, (_, i) => ({
      type: "line" as const,
      to: { x: i * 10, y: i * 5 },
    }));
    const deltas: MorphDeltaSegment[] = Array.from({ length: 30 }, (_, i) => ({
      dx: i,
      dy: i * 0.5,
    }));

    // Call 1000 times (simulating rapid slider movement)
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      lerpSegments(segments, deltas, i / 1000);
    }
    const elapsed = performance.now() - start;

    // 1000 calls should complete in under 100ms total
    expect(elapsed).toBeLessThan(100);
  });
});
