import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@/hooks/usePatternSession", () => ({
  useExportPiece: jest.fn(),
  useExportSession: jest.fn(),
}));

import { PatternExportBar } from "@/components/client/design/PatternExportBar";
import { useExportPiece, useExportSession } from "@/hooks/usePatternSession";
import type { PatternPieceResponse } from "@/types/pattern";

const mockUseExportPiece = useExportPiece as jest.MockedFunction<typeof useExportPiece>;
const mockUseExportSession = useExportSession as jest.MockedFunction<typeof useExportSession>;

let exportPieceMutateAsync: jest.Mock;

const piece: PatternPieceResponse = {
  id: "front-piece",
  session_id: "session-1",
  piece_type: "front_bodice",
  svg_data: "<svg></svg>",
  geometry_params: { bust_width: 42 },
  created_at: "2026-05-01T10:00:00Z",
};

describe("PatternExportBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    exportPieceMutateAsync = jest.fn().mockImplementation(async () => ({
      content: Buffer.from("svg-content").toString("base64"),
      filename: "front-piece.svg",
      contentType: "image/svg+xml",
    }));

    mockUseExportPiece.mockReturnValue({
      mutateAsync: exportPieceMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useExportPiece>);
    mockUseExportSession.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useExportSession>);

    Object.defineProperty(window, "atob", {
      writable: true,
      value: (value: string) => Buffer.from(value, "base64").toString("binary"),
    });

    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: jest.fn().mockReturnValue("blob:test"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: jest.fn(),
    });

    HTMLAnchorElement.prototype.click = jest.fn();
  });

  it("triggers SVG export download for the active piece", async () => {
    render(<PatternExportBar sessionId="session-1" pieces={[piece]} activePiece={piece} />);

    fireEvent.click(screen.getByRole("button", { name: "Xuất SVG" }));

    await waitFor(() => {
      expect(exportPieceMutateAsync).toHaveBeenCalledWith({
        pieceId: "front-piece",
        format: "svg",
        speed: undefined,
        power: undefined,
      });
    });

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it("shows G-code settings when the popover button is clicked", () => {
    render(<PatternExportBar sessionId="session-1" pieces={[piece]} activePiece={piece} />);

    fireEvent.click(screen.getByRole("button", { name: "Xuất G-code" }));

    expect(screen.getByLabelText("Tốc độ cắt (mm/phút)")).toBeTruthy();
    expect(screen.getByLabelText("Công suất laser (%)")).toBeTruthy();
  });

  it("disables export actions when no pieces are available", () => {
    render(<PatternExportBar sessionId="session-1" pieces={[]} activePiece={null} />);

    expect(screen.getByRole("button", { name: "Xuất SVG" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Xuất G-code" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Xuất tất cả" }).hasAttribute("disabled")).toBe(true);
  });
});
