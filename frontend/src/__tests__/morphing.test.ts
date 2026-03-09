/**
 * Story 3.2: Morphing Engine Tests
 *
 * Tests for:
 * - Task 2.3: geometryUtils - vector math (P + alpha * Delta)
 * - Task 2.1: useMorphing hook behavior
 */

import { lerpPoint, lerpSegments, applyMorphDelta } from "@/utils/geometry";
import type { MorphDelta, MorphDeltaSegment } from "@/types/geometry";
import type { Segment, Point, MasterGeometry } from "@/types/geometry";

// --- Task 2.3: geometryUtils ---

describe("geometryUtils - lerpPoint", () => {
  it("returns base point when alpha = 0", () => {
    const base: Point = { x: 100, y: 200 };
    const result = lerpPoint(base, 10, 20, 0);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it("returns base + delta when alpha = 1", () => {
    const base: Point = { x: 100, y: 200 };
    const result = lerpPoint(base, 10, 20, 1);
    expect(result.x).toBe(110);
    expect(result.y).toBe(220);
  });

  it("interpolates correctly at alpha = 0.5", () => {
    const base: Point = { x: 100, y: 200 };
    const result = lerpPoint(base, 10, 20, 0.5);
    expect(result.x).toBe(105);
    expect(result.y).toBe(210);
  });

  it("handles negative deltas", () => {
    const base: Point = { x: 100, y: 200 };
    const result = lerpPoint(base, -20, -40, 1);
    expect(result.x).toBe(80);
    expect(result.y).toBe(160);
  });
});

describe("geometryUtils - lerpSegments", () => {
  const baseSegments: Segment[] = [
    { type: "move", to: { x: 0, y: 0 } },
    { type: "line", to: { x: 100, y: 0 } },
    { type: "line", to: { x: 100, y: 200 } },
  ];

  const deltaSegments: MorphDeltaSegment[] = [
    { dx: 0, dy: 0 },
    { dx: 20, dy: 0 },
    { dx: 20, dy: 20 },
  ];

  it("returns base segments when alpha = 0", () => {
    const result = lerpSegments(baseSegments, deltaSegments, 0);
    expect(result[1].to.x).toBe(100);
    expect(result[2].to.y).toBe(200);
  });

  it("applies full delta when alpha = 1", () => {
    const result = lerpSegments(baseSegments, deltaSegments, 1);
    expect(result[1].to.x).toBe(120);
    expect(result[2].to.x).toBe(120);
    expect(result[2].to.y).toBe(220);
  });

  it("preserves segment type", () => {
    const result = lerpSegments(baseSegments, deltaSegments, 0.5);
    expect(result[0].type).toBe("move");
    expect(result[1].type).toBe("line");
  });

  it("handles curve control points", () => {
    const curveBase: Segment[] = [
      { type: "move", to: { x: 0, y: 0 } },
      {
        type: "curve",
        to: { x: 100, y: 100 },
        control: { cp1: { x: 30, y: 0 }, cp2: { x: 70, y: 100 } },
      },
    ];

    const curveDelta: MorphDeltaSegment[] = [
      { dx: 0, dy: 0 },
      {
        dx: 10,
        dy: 10,
        cp1_dx: 5,
        cp1_dy: 5,
        cp2_dx: 5,
        cp2_dy: 5,
      },
    ];

    const result = lerpSegments(curveBase, curveDelta, 1);
    expect(result[1].to.x).toBe(110);
    expect(result[1].control?.cp1.x).toBe(35);
    expect(result[1].control?.cp2?.x).toBe(75);
  });
});

describe("geometryUtils - applyMorphDelta", () => {
  const baseGeometry: MasterGeometry = {
    parts: [
      {
        part_id: "front",
        name: "Thân trước",
        paths: [
          {
            id: "outline",
            segments: [
              { type: "move", to: { x: 0, y: 0 } },
              { type: "line", to: { x: 100, y: 0 } },
            ],
            closed: true,
          },
        ],
      },
    ],
    version: "1.0",
    units: "mm",
  };

  const morphDelta: MorphDelta = {
    parts: [
      {
        part_id: "front",
        paths: [
          {
            path_id: "outline",
            segments: [
              { dx: 0, dy: 0 },
              { dx: 20, dy: 10 },
            ],
          },
        ],
      },
    ],
    style_id: "classic",
  };

  it("returns base geometry when alpha = 0", () => {
    const result = applyMorphDelta(baseGeometry, morphDelta, 0);
    expect(result.parts[0].paths[0].segments[1].to.x).toBe(100);
  });

  it("applies full delta when alpha = 1", () => {
    const result = applyMorphDelta(baseGeometry, morphDelta, 1);
    expect(result.parts[0].paths[0].segments[1].to.x).toBe(120);
    expect(result.parts[0].paths[0].segments[1].to.y).toBe(10);
  });

  it("preserves metadata (version, units, part names)", () => {
    const result = applyMorphDelta(baseGeometry, morphDelta, 0.5);
    expect(result.version).toBe("1.0");
    expect(result.units).toBe("mm");
    expect(result.parts[0].name).toBe("Thân trước");
    expect(result.parts[0].paths[0].closed).toBe(true);
  });

  it("handles alpha = 0.5 correctly", () => {
    const result = applyMorphDelta(baseGeometry, morphDelta, 0.5);
    expect(result.parts[0].paths[0].segments[1].to.x).toBe(110);
    expect(result.parts[0].paths[0].segments[1].to.y).toBe(5);
  });
});
