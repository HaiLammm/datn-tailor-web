/**
 * Adaptive Canvas Tests
 * Story 3.1: Adaptive Canvas & Khởi tạo Rập chuẩn
 *
 * Tests for:
 * - AdaptiveCanvas component rendering
 * - SvgPattern component rendering
 * - useAutoFit hook calculations
 */

import React from "react";
import { render, screen, renderHook } from "@testing-library/react";
import { AdaptiveCanvas } from "@/components/client/design/AdaptiveCanvas";
import { SvgPattern } from "@/components/client/design/SvgPattern";
import { useAutoFit } from "@/hooks/useAutoFit";
import { MasterGeometry, Path } from "@/types/geometry";

// Mock the design store
const mockToggleComparisonMode = jest.fn();

const mockStoreState: {
  selected_pillar: { id: string; name: string } | null;
  is_pillar_selected: boolean;
  current_pattern: MasterGeometry | null;
  is_comparison_mode: boolean;
  toggleComparisonMode: () => void;
} = {
  selected_pillar: null,
  is_pillar_selected: false,
  current_pattern: null,
  is_comparison_mode: false,
  toggleComparisonMode: mockToggleComparisonMode,
};

jest.mock("@/store/designStore", () => ({
  useDesignStore: jest.fn((selector) => {
    if (typeof selector === "function") {
      return selector(mockStoreState);
    }
    return mockStoreState;
  }),
}));

describe("SvgPattern Component", () => {
  const mockPaths: Path[] = [
    {
      id: "path-1",
      segments: [
        { type: "move", to: { x: 0, y: 0 } },
        { type: "line", to: { x: 100, y: 0 } },
        { type: "line", to: { x: 100, y: 100 } },
        { type: "line", to: { x: 0, y: 100 } },
      ],
      closed: true,
    },
  ];

  it("renders paths correctly", () => {
    const { container } = render(
      <svg>
        <SvgPattern paths={mockPaths} />
      </svg>
    );

    const pathElements = container.querySelectorAll("path");
    expect(pathElements).toHaveLength(1);
  });

  it("generates correct SVG path d attribute for line segments", () => {
    const { container } = render(
      <svg>
        <SvgPattern paths={mockPaths} />
      </svg>
    );

    const pathElement = container.querySelector("path");
    const d = pathElement?.getAttribute("d");
    expect(d).toContain("M 0 0");
    expect(d).toContain("L 100 0");
    expect(d).toContain("L 100 100");
    expect(d).toContain("L 0 100");
    expect(d).toContain("Z"); // closed path
  });

  it("renders curves with control points", () => {
    const curvedPaths: Path[] = [
      {
        id: "curved-path",
        segments: [
          { type: "move", to: { x: 0, y: 0 } },
          {
            type: "curve",
            to: { x: 100, y: 100 },
            control: { cp1: { x: 50, y: 0 }, cp2: { x: 50, y: 100 } },
          },
        ],
        closed: false,
      },
    ];

    const { container } = render(
      <svg>
        <SvgPattern paths={curvedPaths} />
      </svg>
    );

    const pathElement = container.querySelector("path");
    const d = pathElement?.getAttribute("d");
    expect(d).toContain("C 50 0, 50 100, 100 100"); // cubic bezier
  });

  it("renders quadratic curves (single control point)", () => {
    const quadPaths: Path[] = [
      {
        id: "quad-path",
        segments: [
          { type: "move", to: { x: 0, y: 0 } },
          {
            type: "curve",
            to: { x: 100, y: 100 },
            control: { cp1: { x: 50, y: 50 } },
          },
        ],
        closed: false,
      },
    ];

    const { container } = render(
      <svg>
        <SvgPattern paths={quadPaths} />
      </svg>
    );

    const pathElement = container.querySelector("path");
    const d = pathElement?.getAttribute("d");
    expect(d).toContain("Q 50 50, 100 100"); // quadratic bezier
  });
});

describe("useAutoFit Hook", () => {
  const mockGeometry: MasterGeometry = {
    parts: [
      {
        part_id: "body-front",
        name: "Thân trước",
        paths: [
          {
            id: "body-outline",
            segments: [
              { type: "move", to: { x: 10, y: 20 } },
              { type: "line", to: { x: 110, y: 20 } },
              { type: "line", to: { x: 110, y: 220 } },
              { type: "line", to: { x: 10, y: 220 } },
            ],
            closed: true,
          },
        ],
      },
    ],
    version: "1.0",
    units: "mm",
  };

  it("calculates correct viewBox from geometry", () => {
    const { result } = renderHook(() => useAutoFit(mockGeometry, 10));

    // Expected bounds: minX=10, maxX=110, minY=20, maxY=220
    // With padding=10: x=0, y=10, width=120, height=220
    expect(result.current.x).toBe(0);
    expect(result.current.y).toBe(10);
    expect(result.current.width).toBe(120);
    expect(result.current.height).toBe(220);
  });

  it("returns default viewBox for null geometry", () => {
    const { result } = renderHook(() => useAutoFit(null, 10));

    // Default viewBox
    expect(result.current.x).toBe(0);
    expect(result.current.y).toBe(0);
    expect(result.current.width).toBe(1000);
    expect(result.current.height).toBe(1000);
  });

  it("returns default viewBox for empty geometry", () => {
    const emptyGeometry: MasterGeometry = {
      parts: [],
      version: "1.0",
      units: "mm",
    };
    const { result } = renderHook(() => useAutoFit(emptyGeometry, 10));

    expect(result.current.width).toBe(1000);
    expect(result.current.height).toBe(1000);
  });

  it("includes control points in bounds calculation", () => {
    const curvedGeometry: MasterGeometry = {
      parts: [
        {
          part_id: "curved",
          name: "Curved Part",
          paths: [
            {
              id: "curve",
              segments: [
                { type: "move", to: { x: 50, y: 50 } },
                {
                  type: "curve",
                  to: { x: 100, y: 100 },
                  control: { cp1: { x: 0, y: 200 }, cp2: { x: 150, y: 0 } },
                },
              ],
              closed: false,
            },
          ],
        },
      ],
      version: "1.0",
      units: "mm",
    };

    const { result } = renderHook(() => useAutoFit(curvedGeometry, 0));

    // Bounds should include control points: minX=0, maxX=150, minY=0, maxY=200
    expect(result.current.x).toBe(0);
    expect(result.current.y).toBe(0);
    expect(result.current.width).toBe(150);
    expect(result.current.height).toBe(200);
  });
});

describe("AdaptiveCanvas Component", () => {
  beforeEach(() => {
    // Reset mock store state
    mockStoreState.selected_pillar = null;
    mockStoreState.is_pillar_selected = false;
    mockStoreState.current_pattern = null;
  });

  it("renders placeholder when no pillar selected", () => {
    render(<AdaptiveCanvas />);

    expect(
      screen.getByText("Chọn phong cách để xem bản vẽ thiết kế")
    ).toBeInTheDocument();
  });

  it("renders loading state when pillar selected but no pattern", () => {
    mockStoreState.is_pillar_selected = true;
    mockStoreState.selected_pillar = { id: "1", name: "Test Pillar" };

    render(<AdaptiveCanvas />);

    expect(screen.getByText("Đang tải bản vẽ...")).toBeInTheDocument();
  });

  it("renders canvas header", () => {
    render(<AdaptiveCanvas />);

    expect(screen.getByText("Bản vẽ Thiết kế")).toBeInTheDocument();
  });

  it("shows ready status when pattern is loaded", () => {
    mockStoreState.is_pillar_selected = true;
    mockStoreState.selected_pillar = {
      id: "1",
      name: "Test Pillar",
    };
    mockStoreState.current_pattern = {
      parts: [
        {
          part_id: "body",
          name: "Thân",
          paths: [
            {
              id: "p1",
              segments: [{ type: "move" as const, to: { x: 0, y: 0 } }],
              closed: false,
            },
          ],
        },
      ],
      version: "1.0",
      units: "mm",
    };

    render(<AdaptiveCanvas />);

    expect(screen.getByText("Sẵn sàng")).toBeInTheDocument();
  });

  it("renders with custom dimensions", () => {
    const { container } = render(<AdaptiveCanvas width={800} height={600} />);

    const canvasArea = container.querySelector('[style*="height"]');
    expect(canvasArea).toHaveStyle({ height: "600px" });
  });

  it("has accessible role for SVG pattern", () => {
    mockStoreState.is_pillar_selected = true;
    mockStoreState.current_pattern = {
      parts: [
        {
          part_id: "body",
          name: "Thân",
          paths: [
            {
              id: "p1",
              segments: [{ type: "move" as const, to: { x: 0, y: 0 } }],
              closed: false,
            },
          ],
        },
      ],
      version: "1.0",
      units: "mm",
    };

    render(<AdaptiveCanvas />);

    const svg = screen.getByRole("img");
    expect(svg).toHaveAttribute("aria-label", "Bản vẽ rập chuẩn");
  });
});

// ===== Story 3.3: Comparison Mode Integration Tests =====

const patternWithParts: MasterGeometry = {
  parts: [
    {
      part_id: "body",
      name: "Thân",
      paths: [
        {
          id: "p1",
          segments: [
            { type: "move" as const, to: { x: 0, y: 0 } },
            { type: "line" as const, to: { x: 100, y: 0 } },
          ],
          closed: true,
        },
      ],
    },
  ],
  version: "1.0",
  units: "mm",
};

describe("AdaptiveCanvas - Story 3.3 Comparison Mode Integration", () => {
  beforeEach(() => {
    mockStoreState.selected_pillar = { id: "1", name: "Test Pillar" };
    mockStoreState.is_pillar_selected = true;
    mockStoreState.current_pattern = patternWithParts;
    mockStoreState.is_comparison_mode = false;
    mockToggleComparisonMode.mockClear();
  });

  it("renders comparison toggle button when pattern loaded", () => {
    render(<AdaptiveCanvas />);
    expect(screen.getByText("So sánh")).toBeInTheDocument();
  });

  it("does not render comparison toggle when no pattern", () => {
    mockStoreState.current_pattern = null;
    mockStoreState.is_pillar_selected = false;
    mockStoreState.selected_pillar = null;

    render(<AdaptiveCanvas />);
    expect(screen.queryByText("So sánh")).not.toBeInTheDocument();
  });

  it("renders comparison overlay in DOM even when mode is off (CSS visibility)", () => {
    mockStoreState.is_comparison_mode = false;

    const { container } = render(<AdaptiveCanvas />);
    const overlay = container.querySelector('[data-testid="comparison-overlay"]');
    expect(overlay).toBeTruthy();
    expect(overlay?.getAttribute("style")).toContain("hidden");
  });

  it("shows comparison overlay when mode is on", () => {
    mockStoreState.is_comparison_mode = true;

    const { container } = render(<AdaptiveCanvas />);
    const overlay = container.querySelector('[data-testid="comparison-overlay"]');
    expect(overlay).toBeTruthy();
    expect(overlay?.getAttribute("style")).toContain("visible");
  });

  it("calls toggleComparisonMode when button clicked", () => {
    render(<AdaptiveCanvas />);
    const btn = screen.getByText("So sánh");
    btn.click();
    expect(mockToggleComparisonMode).toHaveBeenCalledTimes(1);
  });

  it("shows delta stats panel when comparison mode is on", () => {
    mockStoreState.is_comparison_mode = true;

    const { container } = render(<AdaptiveCanvas />);
    const panel = container.querySelector('[data-testid="delta-stats-panel"]');
    expect(panel).toBeTruthy();
  });

  it("hides delta stats panel when comparison mode is off", () => {
    mockStoreState.is_comparison_mode = false;

    const { container } = render(<AdaptiveCanvas />);
    const panel = container.querySelector('[data-testid="delta-stats-panel"]');
    expect(panel).toBeNull();
  });

  it("renders without morphDelta (backward compatibility)", () => {
    mockStoreState.is_comparison_mode = true;

    // No morphDelta prop → should still render without errors
    const { container } = render(<AdaptiveCanvas />);
    const overlay = container.querySelector('[data-testid="comparison-overlay"]');
    expect(overlay).toBeTruthy();

    // Delta stats should show zeros
    const panel = container.querySelector('[data-testid="delta-stats-panel"]');
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toContain("0");
  });
});
