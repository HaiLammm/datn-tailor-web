/**
 * Component Tests for ComparisonOverlay - Story 3.3 AC2
 *
 * Tests:
 * - Renders overlay paths with correct Heritage Gold color
 * - Uses dashed stroke (strokeDasharray)
 * - Applies opacity 0.5
 * - CSS visibility toggle (visible/hidden)
 * - No data-morph-id on overlay paths (morphing isolation)
 */

import React from "react";
import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import { ComparisonOverlay } from "@/components/client/design/ComparisonOverlay";
import type { MasterGeometry } from "@/types/geometry";

const mockGeometry: MasterGeometry = {
  version: "1.0",
  units: "mm",
  parts: [
    {
      part_id: "front",
      name: "Thân trước",
      paths: [
        {
          id: "path-1",
          closed: true,
          segments: [
            { type: "move", to: { x: 0, y: 0 } },
            { type: "line", to: { x: 100, y: 0 } },
            { type: "line", to: { x: 100, y: 200 } },
            { type: "line", to: { x: 0, y: 200 } },
          ],
        },
        {
          id: "path-2",
          closed: false,
          segments: [
            { type: "move", to: { x: 10, y: 10 } },
            {
              type: "curve",
              to: { x: 90, y: 10 },
              control: { cp1: { x: 30, y: -20 }, cp2: { x: 70, y: -20 } },
            },
          ],
        },
      ],
    },
  ],
};

const renderOverlay = (visible: boolean) => {
  return render(
    <svg>
      <ComparisonOverlay geometry={mockGeometry} visible={visible} />
    </svg>
  );
};

describe("ComparisonOverlay Component (Story 3.3)", () => {
  it("renders overlay group with correct testid", () => {
    const { getByTestId } = renderOverlay(true);
    expect(getByTestId("comparison-overlay")).toBeTruthy();
  });

  it("renders paths with Heritage Gold stroke (#D4AF37)", () => {
    const { container } = renderOverlay(true);
    const paths = container.querySelectorAll(
      '[data-testid="comparison-overlay"] path'
    );
    expect(paths.length).toBe(2);
    for (const path of paths) {
      expect(path.getAttribute("stroke")).toBe("#D4AF37");
    }
  });

  it("renders paths with dashed stroke (strokeDasharray 8 4)", () => {
    const { container } = renderOverlay(true);
    const paths = container.querySelectorAll(
      '[data-testid="comparison-overlay"] path'
    );
    for (const path of paths) {
      expect(path.getAttribute("stroke-dasharray")).toBe("8 4");
    }
  });

  it("renders paths with fill none", () => {
    const { container } = renderOverlay(true);
    const paths = container.querySelectorAll(
      '[data-testid="comparison-overlay"] path'
    );
    for (const path of paths) {
      expect(path.getAttribute("fill")).toBe("none");
    }
  });

  it("applies opacity 0.5 on the overlay group", () => {
    const { getByTestId } = renderOverlay(true);
    const group = getByTestId("comparison-overlay");
    expect(group.getAttribute("opacity")).toBe("0.5");
  });

  it("sets visibility to visible when visible=true", () => {
    const { getByTestId } = renderOverlay(true);
    const group = getByTestId("comparison-overlay");
    expect(group.style.visibility).toBe("visible");
  });

  it("sets visibility to hidden when visible=false", () => {
    const { getByTestId } = renderOverlay(false);
    const group = getByTestId("comparison-overlay");
    expect(group.style.visibility).toBe("hidden");
  });

  it("does NOT have data-morph-id on any path (morphing isolation)", () => {
    const { container } = renderOverlay(true);
    const paths = container.querySelectorAll(
      '[data-testid="comparison-overlay"] path'
    );
    for (const path of paths) {
      expect(path.hasAttribute("data-morph-id")).toBe(false);
    }
  });

  it("renders closed paths with Z command", () => {
    const { container } = renderOverlay(true);
    const paths = container.querySelectorAll(
      '[data-testid="comparison-overlay"] path'
    );
    // path-1 is closed
    expect(paths[0].getAttribute("d")).toContain("Z");
    // path-2 is not closed
    expect(paths[1].getAttribute("d")).not.toContain("Z");
  });

  it("renders curve paths with correct C command", () => {
    const { container } = renderOverlay(true);
    const paths = container.querySelectorAll(
      '[data-testid="comparison-overlay"] path'
    );
    // path-2 has a cubic curve
    expect(paths[1].getAttribute("d")).toContain("C");
  });
});
