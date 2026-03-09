/**
 * Story 4.2 Task 5.1: SanityCheckDashboard Component Tests
 *
 * - Renders 3-column table with correct headers
 * - Displays body, base, suggested values per row
 * - Color-codes rows by severity (normal/warning/danger)
 * - Shows delta values with +/- formatting
 * - Shows guardrail warnings inline
 * - Shows locked state with hash
 * - Shows empty state when no data
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { SanityCheckDashboard } from "@/components/client/design/SanityCheckDashboard";
import type { SanityCheckResponse, ConstraintViolation } from "@/types/geometry";

const normalRow = {
  key: "vong_nguc",
  label_vi: "Vòng ngực",
  body_value: 86.0,
  base_value: 88.0,
  suggested_value: 89.0,
  delta: 1.0,
  unit: "cm",
  severity: "normal" as const,
};

const warningRow = {
  key: "vong_eo",
  label_vi: "Vòng eo",
  body_value: 68.0,
  base_value: 70.0,
  suggested_value: 67.5,
  delta: -2.5,
  unit: "cm",
  severity: "warning" as const,
};

const dangerRow = {
  key: "rong_vai",
  label_vi: "Rộng vai",
  body_value: 36.0,
  base_value: 38.0,
  suggested_value: 44.0,
  delta: 6.0,
  unit: "cm",
  severity: "danger" as const,
};

const mockData: SanityCheckResponse = {
  rows: [normalRow, warningRow, dangerRow],
  guardrail_status: null,
  is_locked: false,
  geometry_hash: null,
};

const sampleWarning: ConstraintViolation = {
  constraint_id: "danger_zone_proximity",
  severity: "soft",
  message_vi: "Vòng eo gần vùng nguy hiểm",
  violated_values: { vong_eo: 67.5 },
  safe_suggestion: null,
};

const sampleViolation: ConstraintViolation = {
  constraint_id: "armhole_vs_bicep",
  severity: "hard",
  message_vi: "Rộng vai vượt quá giới hạn cho phép",
  violated_values: { rong_vai: 44.0 },
  safe_suggestion: { rong_vai: 40.0 },
};

describe("Story 4.2: SanityCheckDashboard", () => {
  describe("3-column table rendering (AC#1)", () => {
    it("renders table with correct Vietnamese column headers", () => {
      render(<SanityCheckDashboard data={mockData} />);

      expect(screen.getByText("Thông số")).toBeInTheDocument();
      expect(screen.getByText("Số đo khách")).toBeInTheDocument();
      expect(screen.getByText("Mẫu chuẩn")).toBeInTheDocument();
      expect(screen.getByText("Đề xuất AI")).toBeInTheDocument();
    });

    it("renders a row for each measurement dimension", () => {
      render(<SanityCheckDashboard data={mockData} />);

      expect(screen.getByText("Vòng ngực")).toBeInTheDocument();
      expect(screen.getByText("Vòng eo")).toBeInTheDocument();
      expect(screen.getByText("Rộng vai")).toBeInTheDocument();
    });

    it("displays body, base, and suggested values per row", () => {
      render(<SanityCheckDashboard data={mockData} />);

      const bustRow = screen.getByTestId("sanity-row-vong_nguc");
      expect(within(bustRow).getByText("86.0 cm")).toBeInTheDocument();
      expect(within(bustRow).getByText("88.0 cm")).toBeInTheDocument();
      expect(within(bustRow).getByText("89.0 cm")).toBeInTheDocument();
    });

    it("shows dash when body_value is null", () => {
      const dataWithNullBody: SanityCheckResponse = {
        ...mockData,
        rows: [{ ...normalRow, body_value: null }],
      };

      render(<SanityCheckDashboard data={dataWithNullBody} />);

      const row = screen.getByTestId("sanity-row-vong_nguc");
      expect(within(row).getByText("—")).toBeInTheDocument();
    });
  });

  describe("Delta display with +/- formatting (AC#2)", () => {
    it("shows positive delta with + sign", () => {
      render(<SanityCheckDashboard data={mockData} />);

      expect(screen.getByText("+1.0 cm")).toBeInTheDocument();
      expect(screen.getByText("+6.0 cm")).toBeInTheDocument();
    });

    it("shows negative delta with - sign", () => {
      render(<SanityCheckDashboard data={mockData} />);

      expect(screen.getByText("-2.5 cm")).toBeInTheDocument();
    });
  });

  describe("Severity color coding (AC#2)", () => {
    it("renders normal rows without highlight background", () => {
      render(<SanityCheckDashboard data={mockData} />);

      const normalRowEl = screen.getByTestId("sanity-row-vong_nguc");
      // Normal rows should not have amber or red backgrounds
      const style = normalRowEl.style.backgroundColor;
      expect(style).not.toBe("#FEF3C7");
      expect(style).not.toBe("#FEF2F2");
    });

    it("renders warning rows with amber background", () => {
      render(<SanityCheckDashboard data={mockData} />);

      const warningRowEl = screen.getByTestId("sanity-row-vong_eo");
      expect(warningRowEl).toHaveStyle({ backgroundColor: "#FEF3C7" });
    });

    it("renders danger rows with red background", () => {
      render(<SanityCheckDashboard data={mockData} />);

      const dangerRowEl = screen.getByTestId("sanity-row-rong_vai");
      expect(dangerRowEl).toHaveStyle({ backgroundColor: "#FEF2F2" });
    });

    it("shows warning emoji for warning severity", () => {
      render(<SanityCheckDashboard data={mockData} />);

      const warningRowEl = screen.getByTestId("sanity-row-vong_eo");
      expect(within(warningRowEl).getByText("⚠️")).toBeInTheDocument();
    });

    it("shows danger emoji for danger severity", () => {
      render(<SanityCheckDashboard data={mockData} />);

      const dangerRowEl = screen.getByTestId("sanity-row-rong_vai");
      expect(within(dangerRowEl).getByText("🚨")).toBeInTheDocument();
    });
  });

  describe("Guardrail integration (AC#3)", () => {
    it("shows guardrail warning message inline for matching row", () => {
      render(
        <SanityCheckDashboard
          data={mockData}
          guardrailWarnings={[sampleWarning]}
        />
      );

      expect(screen.getByText("Vòng eo gần vùng nguy hiểm")).toBeInTheDocument();
    });

    it("shows guardrail violation message inline for matching row", () => {
      render(
        <SanityCheckDashboard
          data={mockData}
          guardrailViolations={[sampleViolation]}
        />
      );

      expect(screen.getByText("Rộng vai vượt quá giới hạn cho phép")).toBeInTheDocument();
    });

    it("does not show guardrail messages for non-matching rows", () => {
      const unrelatedWarning: ConstraintViolation = {
        constraint_id: "some_other",
        severity: "soft",
        message_vi: "Unrelated warning",
        violated_values: { vong_dau: 50.0 },
        safe_suggestion: null,
      };

      render(
        <SanityCheckDashboard
          data={mockData}
          guardrailWarnings={[unrelatedWarning]}
        />
      );

      expect(screen.queryByText("Unrelated warning")).not.toBeInTheDocument();
    });

    it("shows guardrail status banner when status is warning", () => {
      const dataWithWarningStatus: SanityCheckResponse = {
        ...mockData,
        guardrail_status: "warning",
      };

      render(<SanityCheckDashboard data={dataWithWarningStatus} />);

      expect(screen.getByText("Cảnh báo ràng buộc kỹ thuật")).toBeInTheDocument();
    });

    it("shows guardrail status banner when status is rejected", () => {
      const dataWithRejectedStatus: SanityCheckResponse = {
        ...mockData,
        guardrail_status: "rejected",
      };

      render(<SanityCheckDashboard data={dataWithRejectedStatus} />);

      expect(screen.getByText("Vi phạm ràng buộc vật lý")).toBeInTheDocument();
    });

    it("does not show guardrail status banner when status is passed", () => {
      const dataWithPassedStatus: SanityCheckResponse = {
        ...mockData,
        guardrail_status: "passed",
      };

      render(<SanityCheckDashboard data={dataWithPassedStatus} />);

      expect(screen.queryByText("Cảnh báo ràng buộc kỹ thuật")).not.toBeInTheDocument();
      expect(screen.queryByText("Vi phạm ràng buộc vật lý")).not.toBeInTheDocument();
    });
  });

  describe("Locked state display (AC#4)", () => {
    it("shows locked badge with truncated geometry_hash when locked", () => {
      const lockedData: SanityCheckResponse = {
        ...mockData,
        is_locked: true,
        geometry_hash: "abcdef1234567890abcdef",
      };

      render(<SanityCheckDashboard data={lockedData} />);

      expect(screen.getByText("Đã khóa")).toBeInTheDocument();
      expect(screen.getByText("abcdef123456...")).toBeInTheDocument();
    });

    it("shows unlocked message when not locked", () => {
      render(<SanityCheckDashboard data={mockData} />);

      expect(screen.getByText("Chưa khóa thiết kế")).toBeInTheDocument();
    });
  });

  describe("Empty state (AC#5)", () => {
    it("shows empty state when data is null", () => {
      render(<SanityCheckDashboard data={null} />);

      expect(screen.getByTestId("sanity-check-empty")).toBeInTheDocument();
      expect(screen.getByText("Chưa có thiết kế để đối soát")).toBeInTheDocument();
      expect(screen.getByText("Vui lòng tạo bản vẽ trước.")).toBeInTheDocument();
    });

    it("shows empty state when rows are empty", () => {
      const emptyData: SanityCheckResponse = {
        rows: [],
        guardrail_status: null,
        is_locked: false,
        geometry_hash: null,
      };

      render(<SanityCheckDashboard data={emptyData} />);

      expect(screen.getByTestId("sanity-check-empty")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("shows loading skeleton when isLoading is true", () => {
      render(<SanityCheckDashboard data={null} isLoading={true} />);

      expect(screen.getByTestId("sanity-check-loading")).toBeInTheDocument();
    });

    it("does not show loading skeleton when isLoading is false", () => {
      render(<SanityCheckDashboard data={mockData} isLoading={false} />);

      expect(screen.queryByTestId("sanity-check-loading")).not.toBeInTheDocument();
    });
  });

  describe("Footer legend", () => {
    it("shows severity legend in footer", () => {
      render(<SanityCheckDashboard data={mockData} />);

      expect(screen.getByText("Chênh lệch vừa (2-5cm)")).toBeInTheDocument();
      expect(screen.getByText("Chênh lệch lớn (≥5cm)")).toBeInTheDocument();
    });
  });
});
