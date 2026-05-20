import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

jest.mock("@/hooks/usePatternSession", () => ({
  usePatternSession: jest.fn(),
  useGeneratePattern: jest.fn(),
  useExportPiece: jest.fn(),
  useExportSession: jest.fn(),
}));

import SessionDetailClient from "@/app/(workplace)/design-session/[sessionId]/SessionDetailClient";
import {
  useExportPiece,
  useExportSession,
  useGeneratePattern,
  usePatternSession,
} from "@/hooks/usePatternSession";
import type { PatternSessionResponse } from "@/types/pattern";

const mockUsePatternSession = usePatternSession as jest.MockedFunction<typeof usePatternSession>;
const mockUseGeneratePattern = useGeneratePattern as jest.MockedFunction<typeof useGeneratePattern>;
const mockUseExportPiece = useExportPiece as jest.MockedFunction<typeof useExportPiece>;
const mockUseExportSession = useExportSession as jest.MockedFunction<typeof useExportSession>;

function createSession(overrides?: Partial<PatternSessionResponse>): PatternSessionResponse {
  return {
    id: "session-1",
    tenant_id: "tenant-1",
    customer_id: "customer-1",
    created_by: "owner-1",
    garment_type: "ao_dai",
    status: "completed",
    do_dai_ao: 65,
    ha_eo: 18,
    vong_co: 36,
    vong_nach: 38,
    vong_nguc: 88,
    vong_eo: 68,
    vong_mong: 92,
    do_dai_tay: 55,
    vong_bap_tay: 28,
    vong_co_tay: 16,
    notes: null,
    pieces: [
      {
        id: "front-piece",
        session_id: "session-1",
        piece_type: "front_bodice",
        svg_data: '<svg viewBox="0 0 100 100"><text x="10" y="50">Front Piece</text></svg>',
        geometry_params: { bust_width: 42, waist_width: 38, hip_width: 45, armhole_drop: 3.5, neck_depth: 2.2, hem_width: 37, seam_allowance: 1 },
        created_at: "2026-05-01T10:00:00Z",
      },
      {
        id: "back-piece",
        session_id: "session-1",
        piece_type: "back_bodice",
        svg_data: '<svg viewBox="0 0 100 100"><text x="10" y="50">Back Piece</text></svg>',
        geometry_params: { bust_width: 41, waist_width: 37, hip_width: 44, armhole_drop: 3.4, neck_depth: 2.1, hem_width: 37, seam_allowance: 1 },
        created_at: "2026-05-01T10:00:00Z",
      },
      {
        id: "sleeve-piece",
        session_id: "session-1",
        piece_type: "sleeve",
        svg_data: '<svg viewBox="0 0 100 100"><text x="10" y="50">Sleeve Piece</text></svg>',
        geometry_params: { cap_height: 15, bicep_width: 18, wrist_width: 9, sleeve_length: 55, seam_allowance: 1 },
        created_at: "2026-05-01T10:00:00Z",
      },
    ],
    created_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-05-01T10:00:00Z",
    ...overrides,
  };
}

describe("SessionDetailClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGeneratePattern.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGeneratePattern>);
    mockUseExportPiece.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useExportPiece>);
    mockUseExportSession.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useExportSession>);
  });

  it("renders both summary and preview panes", () => {
    mockUsePatternSession.mockReturnValue({
      session: createSession(),
      isLoading: false,
      isFetching: false,
      error: null,
    });

    render(<SessionDetailClient sessionId="session-1" initialSession={createSession()} initialCustomerName="Nguyễn An" />);

    expect(screen.getByText("Xem mẫu rập")).toBeTruthy();
    expect(screen.getByText("Bản xem trước SVG")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Xuất SVG" })).toBeTruthy();
  });

  it("renders loading skeleton while session is loading", () => {
    mockUsePatternSession.mockReturnValue({
      session: null,
      isLoading: true,
      isFetching: false,
      error: null,
    });

    render(<SessionDetailClient sessionId="session-1" />);

    expect(screen.getByTestId("session-detail-skeleton")).toBeTruthy();
  });

  it("renders not found state for missing session", () => {
    mockUsePatternSession.mockReturnValue({
      session: null,
      isLoading: false,
      isFetching: false,
      error: "Phiên thiết kế không tồn tại",
    });

    render(
      <SessionDetailClient
        sessionId="missing-session"
        initialError="Phiên thiết kế không tồn tại"
        initialStatusCode={404}
      />
    );

    expect(screen.getByText("Phiên thiết kế không tồn tại")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Quay lại tạo phiên thiết kế" }).getAttribute("href")).toBe("/design-session");
  });

  it("shows generate button for draft sessions", () => {
    const draftSession = createSession({ status: "draft", pieces: [] });

    mockUsePatternSession.mockReturnValue({
      session: draftSession,
      isLoading: false,
      isFetching: false,
      error: null,
    });

    render(<SessionDetailClient sessionId="session-1" initialSession={draftSession} />);

    expect(screen.getByRole("button", { name: "Tạo mẫu" })).toBeTruthy();
    expect(screen.getByText(/Chưa có mẫu rập/)).toBeTruthy();
  });

  it("renders piece tabs when session is completed", () => {
    const completedSession = createSession();

    mockUsePatternSession.mockReturnValue({
      session: completedSession,
      isLoading: false,
      isFetching: false,
      error: null,
    });

    render(<SessionDetailClient sessionId="session-1" initialSession={completedSession} />);

    expect(screen.getByRole("button", { name: "Thân trước" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Thân sau" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tay áo" })).toBeTruthy();
  });
});
