import { beforeEach, describe, expect, it } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";

import { PatternPreview } from "@/components/client/design/PatternPreview";
import type { PatternPieceResponse } from "@/types/pattern";

const pieces: PatternPieceResponse[] = [
  {
    id: "front-piece",
    session_id: "session-1",
    piece_type: "front_bodice",
    svg_data:
      '<svg viewBox="0 0 100 100"><text x="10" y="50">Front Piece</text></svg>',
    geometry_params: {
      bust_width: 42,
      waist_width: 38,
      hip_width: 45,
      armhole_drop: 3.5,
      neck_depth: 2.2,
      hem_width: 37,
      seam_allowance: 1,
    },
    created_at: "2026-05-01T10:00:00Z",
  },
  {
    id: "back-piece",
    session_id: "session-1",
    piece_type: "back_bodice",
    svg_data:
      '<svg viewBox="0 0 100 100"><text x="10" y="50">Back Piece</text></svg>',
    geometry_params: {
      bust_width: 41,
      waist_width: 37,
      hip_width: 44,
      armhole_drop: 3.4,
      neck_depth: 2.1,
      hem_width: 37,
      seam_allowance: 1,
    },
    created_at: "2026-05-01T10:00:00Z",
  },
  {
    id: "sleeve-piece",
    session_id: "session-1",
    piece_type: "sleeve",
    svg_data:
      '<svg viewBox="0 0 100 100"><text x="10" y="50">Sleeve Piece</text></svg>',
    geometry_params: {
      cap_height: 15,
      bicep_width: 18,
      wrist_width: 9,
      sleeve_length: 55,
      seam_allowance: 1,
    },
    created_at: "2026-05-01T10:00:00Z",
  },
];

describe("PatternPreview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders SVG from svg_data string", () => {
    const { container } = render(<PatternPreview pieces={pieces} />);

    expect(screen.getByText("Front Piece")).toBeTruthy();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Rộng ngực")).toBeTruthy();
  });

  it("switches displayed SVG when piece tab changes", () => {
    render(<PatternPreview pieces={pieces} />);

    fireEvent.click(screen.getByRole("button", { name: "Thân sau" }));

    expect(screen.getByText("Back Piece")).toBeTruthy();
    expect(screen.queryByText("Front Piece")).toBeNull();
  });

  it("updates zoom and pan state from user interactions", () => {
    render(<PatternPreview pieces={pieces} />);

    const viewport = screen.getByTestId("pattern-preview-viewport");
    const stage = screen.getByTestId("pattern-preview-stage");

    fireEvent.wheel(viewport, { deltaY: -100 });
    expect(screen.getByTestId("pattern-scale-label").textContent).toContain("110%");

    fireEvent.mouseDown(viewport, { clientX: 10, clientY: 20 });
    fireEvent.mouseMove(viewport, { clientX: 30, clientY: 55 });
    fireEvent.mouseUp(viewport);

    expect(stage.getAttribute("style")).toContain("translate(20px, 35px) scale(1.1)");
  });
});
