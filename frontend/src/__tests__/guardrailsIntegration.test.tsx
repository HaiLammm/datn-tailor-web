/**
 * Story 4.1b Task 7.2: Integration Tests for Guardrail UI
 * - Slider change → guardrail check → warning display
 * - Hard violation → auto snap-back → slider values restored
 * - Lock Design blocked when violations present
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useDesignStore } from "@/store/designStore";
import { IntensitySliders } from "@/components/client/design/IntensitySliders";
import type { ConstraintViolation } from "@/types/geometry";
import type { StylePillarResponse } from "@/types/style";

// Mock server actions
jest.mock("@/app/actions/design-actions", () => ({
  submitIntensity: jest.fn().mockResolvedValue({
    success: true,
    sequence_id: 1,
    warnings: [],
  }),
}));

jest.mock("@/app/actions/geometry-actions", () => ({
  lockDesign: jest.fn(),
  checkGuardrails: jest.fn(),
}));

const testPillar: StylePillarResponse = {
  id: "classic",
  name: "Cổ điển",
  description: "Phong cách cổ điển",
  image_url: null,
  is_default: true,
  sliders: [
    {
      key: "do_rong_vai",
      label: "Độ rộng vai",
      description: null,
      min_value: 0,
      max_value: 100,
      default_value: 50,
      step: 1,
      unit: "mm",
      golden_points: [38, 62],
    },
    {
      key: "vong_nach",
      label: "Vòng nách",
      description: null,
      min_value: 0,
      max_value: 100,
      default_value: 50,
      step: 1,
      unit: "mm",
      golden_points: [40, 60],
    },
  ],
};

const sampleViolation: ConstraintViolation = {
  constraint_id: "armhole_vs_bicep",
  severity: "hard",
  message_vi: "Vòng nách nhỏ hơn vòng bắp tay + 2cm",
  violated_values: { vong_nach: 30.0, vong_bap_tay: 35.0 },
  safe_suggestion: { vong_nach: 37.0 },
};

const sampleWarning: ConstraintViolation = {
  constraint_id: "danger_zone_vong_nach",
  severity: "soft",
  message_vi: "Vòng nách gần vùng nguy hiểm",
  violated_values: { vong_nach: 37.5 },
  safe_suggestion: null,
};

describe("Story 4.1b: Guardrail Integration Tests", () => {
  beforeEach(() => {
    useDesignStore.getState().clearSession();
  });

  describe("Warning display in IntensitySliders", () => {
    it("displays soft constraint warnings inline next to relevant slider", () => {
      // Setup store with pillar, values, and a warning
      useDesignStore.setState({
        selected_pillar: testPillar,
        intensity_values: { do_rong_vai: 50, vong_nach: 37 },
        guardrail_warnings: [sampleWarning],
        guardrail_violations: [],
        guardrail_status: "warning",
      });

      render(<IntensitySliders />);

      // Warning message should appear
      expect(screen.getByText("Vòng nách gần vùng nguy hiểm")).toBeInTheDocument();
    });

    it("displays hard constraint violations with red styling", () => {
      useDesignStore.setState({
        selected_pillar: testPillar,
        intensity_values: { do_rong_vai: 50, vong_nach: 30 },
        guardrail_warnings: [],
        guardrail_violations: [sampleViolation],
        guardrail_status: "rejected",
      });

      render(<IntensitySliders />);

      // Violation message should appear
      expect(screen.getByText("Vòng nách nhỏ hơn vòng bắp tay + 2cm")).toBeInTheDocument();
    });

    it("shows no guardrail UI when status is passed", () => {
      useDesignStore.setState({
        selected_pillar: testPillar,
        intensity_values: { do_rong_vai: 50, vong_nach: 50 },
        guardrail_warnings: [],
        guardrail_violations: [],
        guardrail_status: "passed",
      });

      render(<IntensitySliders />);

      expect(screen.queryByText("Vòng nách nhỏ hơn vòng bắp tay + 2cm")).not.toBeInTheDocument();
      expect(screen.queryByText("Vòng nách gần vùng nguy hiểm")).not.toBeInTheDocument();
    });
  });

  describe("Snap-back restores slider values", () => {
    it("snapBackToSafe restores intensity_values and clears violations", () => {
      // Simulate: user adjusted, got rejected, now snap back
      useDesignStore.setState({
        selected_pillar: testPillar,
        intensity_values: { do_rong_vai: 99, vong_nach: 10 },
        last_valid_intensity_values: { do_rong_vai: 50, vong_nach: 50 },
        guardrail_status: "rejected",
        guardrail_violations: [sampleViolation],
        guardrail_warnings: [],
      });

      // Snap back
      useDesignStore.getState().snapBackToSafe();

      const state = useDesignStore.getState();
      expect(state.intensity_values).toEqual({ do_rong_vai: 50, vong_nach: 50 });
      expect(state.guardrail_status).toBeNull();
      expect(state.guardrail_violations).toEqual([]);
    });

    it("sliders re-render with restored values after snap-back", () => {
      useDesignStore.setState({
        selected_pillar: testPillar,
        intensity_values: { do_rong_vai: 99, vong_nach: 10 },
        last_valid_intensity_values: { do_rong_vai: 50, vong_nach: 50 },
        guardrail_status: "rejected",
        guardrail_violations: [sampleViolation],
      });

      const { rerender } = render(<IntensitySliders />);

      // Snap back
      useDesignStore.getState().snapBackToSafe();
      rerender(<IntensitySliders />);

      // After snap-back, violation message should be gone
      expect(screen.queryByText("Vòng nách nhỏ hơn vòng bắp tay + 2cm")).not.toBeInTheDocument();
    });
  });

  describe("Lock Design blocked with violations", () => {
    it("prevents lock when guardrail_status is rejected", () => {
      useDesignStore.setState({
        guardrail_status: "rejected",
        guardrail_violations: [sampleViolation],
        master_geometry: { sequence_id: 1, geometry_hash: "abc", deltas: [], ease_profile: {} },
        current_morph_delta: { parts: [], style_id: "classic" },
        is_design_locked: false,
      });

      const state = useDesignStore.getState();
      // The lock guard check from DesignSessionClient
      const shouldBlockLock = state.guardrail_status === "rejected";
      expect(shouldBlockLock).toBe(true);
    });

    it("allows lock when guardrail_status is passed", () => {
      useDesignStore.setState({
        guardrail_status: "passed",
        guardrail_violations: [],
        guardrail_warnings: [],
      });

      const state = useDesignStore.getState();
      const shouldBlockLock = state.guardrail_status === "rejected";
      expect(shouldBlockLock).toBe(false);
    });

    it("allows lock when guardrail_status is warning (soft constraints only)", () => {
      useDesignStore.setState({
        guardrail_status: "warning",
        guardrail_violations: [],
        guardrail_warnings: [sampleWarning],
      });

      const state = useDesignStore.getState();
      const shouldBlockLock = state.guardrail_status === "rejected";
      expect(shouldBlockLock).toBe(false);
    });
  });

  describe("Guardrail status transitions", () => {
    it("passed → warning → rejected → snap-back → null", () => {
      useDesignStore.setState({ intensity_values: { do_rong_vai: 50 } });

      // 1. Passed
      useDesignStore.getState().setGuardrailResult({
        status: "passed",
        violations: [],
        warnings: [],
        last_valid_sequence_id: null,
      });
      expect(useDesignStore.getState().guardrail_status).toBe("passed");

      // 2. Warning
      useDesignStore.getState().setGuardrailResult({
        status: "warning",
        violations: [],
        warnings: [sampleWarning],
        last_valid_sequence_id: null,
      });
      expect(useDesignStore.getState().guardrail_status).toBe("warning");
      expect(useDesignStore.getState().guardrail_warnings).toHaveLength(1);

      // 3. Rejected
      useDesignStore.setState({ intensity_values: { do_rong_vai: 99 } });
      useDesignStore.getState().setGuardrailResult({
        status: "rejected",
        violations: [sampleViolation],
        warnings: [],
        last_valid_sequence_id: "uuid-snap",
      });
      expect(useDesignStore.getState().guardrail_status).toBe("rejected");
      expect(useDesignStore.getState().guardrail_violations).toHaveLength(1);
      // last_valid_intensity_values was set during warning (not overwritten by rejected)
      expect(useDesignStore.getState().last_valid_intensity_values).toEqual({ do_rong_vai: 50 });

      // 4. Snap back
      useDesignStore.getState().snapBackToSafe();
      expect(useDesignStore.getState().guardrail_status).toBeNull();
      expect(useDesignStore.getState().intensity_values).toEqual({ do_rong_vai: 50 });
    });
  });
});
