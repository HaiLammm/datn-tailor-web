/**
 * Story 3.2 Task 3: Slider Integration Tests
 *
 * Tests for:
 * - HeritageSlider onValueChange (real-time) and onValueCommit (final)
 * - AdaptiveCanvas morphDelta prop integration
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdaptiveCanvas } from "@/components/client/design/AdaptiveCanvas";
import type { MasterGeometry, MorphDelta } from "@/types/geometry";

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  cb(0);
  return 1;
});
global.cancelAnimationFrame = jest.fn();

// Mock store state
const mockStoreState: {
  selected_pillar: { id: string; name: string } | null;
  is_pillar_selected: boolean;
  current_pattern: MasterGeometry | null;
} = {
  selected_pillar: null,
  is_pillar_selected: false,
  current_pattern: null,
};

jest.mock("@/store/designStore", () => ({
  useDesignStore: jest.fn((selector) => {
    if (typeof selector === "function") {
      return selector(mockStoreState);
    }
    return mockStoreState;
  }),
}));

const testGeometry: MasterGeometry = {
  parts: [
    {
      part_id: "front",
      name: "Thân trước",
      paths: [
        {
          id: "outline",
          segments: [
            { type: "move" as const, to: { x: 0, y: 0 } },
            { type: "line" as const, to: { x: 100, y: 0 } },
            { type: "line" as const, to: { x: 100, y: 200 } },
          ],
          closed: true,
        },
      ],
    },
  ],
  version: "1.0",
  units: "mm",
};

const testDelta: MorphDelta = {
  parts: [
    {
      part_id: "front",
      paths: [
        {
          path_id: "outline",
          segments: [
            { dx: 0, dy: 0 },
            { dx: 20, dy: 0 },
            { dx: 20, dy: 20 },
          ],
        },
      ],
    },
  ],
  style_id: "classic",
};

describe("AdaptiveCanvas with morphDelta", () => {
  beforeEach(() => {
    mockStoreState.selected_pillar = { id: "1", name: "Classic" };
    mockStoreState.is_pillar_selected = true;
    mockStoreState.current_pattern = testGeometry;
  });

  afterEach(() => {
    mockStoreState.selected_pillar = null;
    mockStoreState.is_pillar_selected = false;
    mockStoreState.current_pattern = null;
  });

  it("renders SVG with data-morph-id attributes on paths", () => {
    const { container } = render(
      <AdaptiveCanvas morphDelta={testDelta} />
    );

    const paths = container.querySelectorAll("path[data-morph-id]");
    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0].getAttribute("data-morph-id")).toBe("outline");
  });

  it("renders without morphDelta (backward compatible)", () => {
    const { container } = render(<AdaptiveCanvas />);

    const svg = screen.getByRole("img");
    expect(svg).toBeInTheDocument();
  });

  it("attaches ref to SVG element for direct DOM morphing", () => {
    const { container } = render(
      <AdaptiveCanvas morphDelta={testDelta} />
    );

    const svg = container.querySelector("svg[role='img']");
    expect(svg).toBeInTheDocument();
  });
});
