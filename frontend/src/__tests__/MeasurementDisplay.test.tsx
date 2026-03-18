/**
 * MeasurementDisplay Component Tests — Story 4.4d
 * Tests: render default, render history, empty state, loading, error, responsive
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import MeasurementDisplay from "@/components/client/profile/MeasurementDisplay";
import type { MeasurementsData } from "@/app/actions/profile-actions";
import type { MeasurementResponse } from "@/types/customer";

// Mock the server action module entirely to avoid next-auth import issues
const mockGetMyMeasurements = jest.fn();
jest.mock("@/app/actions/profile-actions", () => ({
  getMyMeasurements: (...args: unknown[]) => mockGetMyMeasurements(...args),
}));

// Import types only (the mock is via mockGetMyMeasurements)
import type { MeasurementsData } from "@/app/actions/profile-actions";

const DEFAULT_MEASUREMENT: MeasurementResponse = {
  id: "m1",
  customer_profile_id: "cp1",
  tenant_id: "t1",
  neck: 34,
  shoulder_width: 38,
  bust: 88,
  waist: 68,
  hip: 92,
  top_length: 60,
  sleeve_length: 58,
  wrist: 15,
  height: 162,
  weight: 55,
  measurement_notes: null,
  is_default: true,
  measured_date: "2026-01-15",
  measured_by: null,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
};

const OLD_MEASUREMENT: MeasurementResponse = {
  ...DEFAULT_MEASUREMENT,
  id: "m2",
  bust: 86,
  waist: 66,
  is_default: false,
  measured_date: "2025-06-10",
};

const DATA_WITH_MEASUREMENTS: MeasurementsData = {
  default_measurement: DEFAULT_MEASUREMENT,
  measurements: [DEFAULT_MEASUREMENT, OLD_MEASUREMENT],
  measurement_count: 2,
};

const DATA_SINGLE: MeasurementsData = {
  default_measurement: DEFAULT_MEASUREMENT,
  measurements: [DEFAULT_MEASUREMENT],
  measurement_count: 1,
};

const DATA_EMPTY: MeasurementsData = {
  default_measurement: null,
  measurements: [],
  measurement_count: 0,
};

describe("MeasurementDisplay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Loading state ──────────────────────────────────────────────────────

  it("renders loading skeleton when no data and no error", () => {
    render(<MeasurementDisplay initialData={null} />);
    expect(screen.getByTestId("measurement-skeleton")).toBeInTheDocument();
  });

  // ── Error state ────────────────────────────────────────────────────────

  it("renders error state with retry button", () => {
    render(<MeasurementDisplay initialData={null} initialError="Không thể tải số đo" />);
    expect(screen.getByTestId("measurement-error")).toBeInTheDocument();
    expect(screen.getByText("Không thể tải số đo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /thử lại/i })).toBeInTheDocument();
  });

  it("calls getMyMeasurements on retry and shows data on success", async () => {
    mockGetMyMeasurements.mockResolvedValue({
      success: true,
      data: DATA_SINGLE,
    });

    render(<MeasurementDisplay initialData={null} initialError="Lỗi kết nối" />);
    fireEvent.click(screen.getByRole("button", { name: /thử lại/i }));

    await waitFor(() => {
      expect(screen.getByText("Số đo mặc định")).toBeInTheDocument();
    });
  });

  it("shows new error message on retry failure", async () => {
    mockGetMyMeasurements.mockResolvedValue({
      success: false,
      error: "Lỗi kết nối mới",
    });

    render(<MeasurementDisplay initialData={null} initialError="Lỗi ban đầu" />);
    fireEvent.click(screen.getByRole("button", { name: /thử lại/i }));

    await waitFor(() => {
      expect(screen.getByText("Lỗi kết nối mới")).toBeInTheDocument();
    });
  });

  // ── Empty state ────────────────────────────────────────────────────────

  it("renders empty state when no measurements", () => {
    render(<MeasurementDisplay initialData={DATA_EMPTY} />);
    expect(screen.getByTestId("measurement-empty")).toBeInTheDocument();
    expect(screen.getByText("Chưa có số đo nào")).toBeInTheDocument();
    expect(screen.getByText(/đặt lịch hẹn/i)).toBeInTheDocument();
  });

  // ── Default measurement ────────────────────────────────────────────────

  it("renders default measurement card with Vietnamese labels", () => {
    render(<MeasurementDisplay initialData={DATA_SINGLE} />);
    expect(screen.getByText("Số đo mặc định")).toBeInTheDocument();
    expect(screen.getByText("Vòng ngực")).toBeInTheDocument();
    expect(screen.getByText("Vòng eo")).toBeInTheDocument();
    expect(screen.getByText("Vòng mông")).toBeInTheDocument();
    expect(screen.getByText("Chiều cao")).toBeInTheDocument();
    expect(screen.getByText("Cân nặng")).toBeInTheDocument();
  });

  it("shows cm unit for measurements and kg for weight", () => {
    render(<MeasurementDisplay initialData={DATA_SINGLE} />);
    expect(screen.getByText("88 cm")).toBeInTheDocument(); // bust
    expect(screen.getByText("162 cm")).toBeInTheDocument(); // height
    expect(screen.getByText("55 kg")).toBeInTheDocument(); // weight
  });

  it("shows Mặc định badge on default measurement", () => {
    render(<MeasurementDisplay initialData={DATA_SINGLE} />);
    const badges = screen.getAllByText("Mặc định");
    expect(badges.length).toBeGreaterThan(0);
  });

  // ── Read-only notice ───────────────────────────────────────────────────

  it("displays read-only notice banner", () => {
    render(<MeasurementDisplay initialData={DATA_SINGLE} />);
    expect(
      screen.getByText("Số đo được cập nhật bởi thợ may tại tiệm")
    ).toBeInTheDocument();
  });

  // ── History list (AC2) ─────────────────────────────────────────────────

  it("renders measurement history section when more than 1 measurement", () => {
    render(<MeasurementDisplay initialData={DATA_WITH_MEASUREMENTS} />);
    expect(screen.getByText("Lịch sử số đo")).toBeInTheDocument();
  });

  it("does NOT render history section when only 1 measurement", () => {
    render(<MeasurementDisplay initialData={DATA_SINGLE} />);
    expect(screen.queryByText("Lịch sử số đo")).not.toBeInTheDocument();
  });

  it("history items are collapsible and expand on click", () => {
    render(<MeasurementDisplay initialData={DATA_WITH_MEASUREMENTS} />);
    // Find history item buttons (collapsible)
    const historyButtons = screen.getAllByRole("button");
    // Initial: content should not be visible; click to expand
    fireEvent.click(historyButtons[0]);
    // After expand, measurement fields should appear in expanded area
    // (exact text depends on measurement data in the history items)
    expect(historyButtons[0]).toHaveAttribute("aria-expanded", "true");
  });

  // ── Page integration ───────────────────────────────────────────────────

  it("shows measured date from default measurement", () => {
    render(<MeasurementDisplay initialData={DATA_SINGLE} />);
    // Date "2026-01-15" displayed somewhere in the component
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });
});
