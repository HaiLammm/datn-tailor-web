/**
 * Story 3.2: useMorphing Hook Tests
 *
 * Tests for:
 * - Hook initialization
 * - Alpha ref tracking
 * - requestAnimationFrame usage
 */

import { renderHook, act } from "@testing-library/react";
import { useMorphing } from "@/hooks/useMorphing";
import type { MasterGeometry, MorphDelta } from "@/types/geometry";

// Mock requestAnimationFrame
let rafCallback: FrameRequestCallback | null = null;
const mockRaf = jest.fn((cb: FrameRequestCallback) => {
  rafCallback = cb;
  return 1;
});
const mockCancelRaf = jest.fn();

beforeAll(() => {
  global.requestAnimationFrame = mockRaf;
  global.cancelAnimationFrame = mockCancelRaf;
});

beforeEach(() => {
  rafCallback = null;
  mockRaf.mockClear();
  mockCancelRaf.mockClear();
});

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

describe("useMorphing hook", () => {
  it("initializes with alphaRef = 0", () => {
    const { result } = renderHook(() =>
      useMorphing({ baseGeometry, morphDelta })
    );

    expect(result.current.alphaRef.current).toBe(0);
  });

  it("provides svgContainerRef", () => {
    const { result } = renderHook(() =>
      useMorphing({ baseGeometry, morphDelta })
    );

    expect(result.current.svgContainerRef).toBeDefined();
    expect(result.current.svgContainerRef.current).toBeNull();
  });

  it("updateAlpha schedules requestAnimationFrame", () => {
    const { result } = renderHook(() =>
      useMorphing({ baseGeometry, morphDelta })
    );

    act(() => {
      result.current.updateAlpha(0.5);
    });

    expect(mockRaf).toHaveBeenCalledTimes(1);
    expect(result.current.alphaRef.current).toBe(0.5);
  });

  it("cancels previous frame when updateAlpha called rapidly", () => {
    const { result } = renderHook(() =>
      useMorphing({ baseGeometry, morphDelta })
    );

    act(() => {
      result.current.updateAlpha(0.3);
      result.current.updateAlpha(0.5);
    });

    // Second call should cancel the first frame
    expect(mockCancelRaf).toHaveBeenCalled();
    expect(result.current.alphaRef.current).toBe(0.5);
  });

  it("handles null geometry gracefully", () => {
    const { result } = renderHook(() =>
      useMorphing({ baseGeometry: null, morphDelta: null })
    );

    // Should not throw
    act(() => {
      result.current.updateAlpha(0.5);
    });

    expect(result.current.alphaRef.current).toBe(0.5);
  });
});
