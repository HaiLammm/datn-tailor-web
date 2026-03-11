/**
 * Tests for Story 4.1b: Guardrail UI Store Actions
 * - setGuardrailResult, snapBackToSafe, clearGuardrailState
 * - Snap-back restores last_valid_intensity_values
 * - guardrail_status transitions
 */

import { useDesignStore } from "@/store/designStore";
import type { ConstraintViolation } from "@/types/geometry";

const sampleViolation: ConstraintViolation = {
  constraint_id: "armhole_vs_bicep",
  severity: "hard",
  message_vi: "Vòng nách nhỏ hơn vòng bắp tay + 2cm",
  violated_values: { vong_nach: 30.0, vong_bap_tay: 35.0 },
  safe_suggestion: { vong_nach: 37.0 },
};

const sampleWarning: ConstraintViolation = {
  constraint_id: "danger_zone_proximity",
  severity: "soft",
  message_vi: "Vòng nách gần vùng nguy hiểm",
  violated_values: { vong_nach: 37.5 },
  safe_suggestion: null,
};

describe("Story 4.1b: Guardrail Store Actions", () => {
  beforeEach(() => {
    useDesignStore.getState().clearSession();
  });

  it("initial guardrail state is null/empty", () => {
    const state = useDesignStore.getState();
    expect(state.guardrail_status).toBeNull();
    expect(state.guardrail_warnings).toEqual([]);
    expect(state.guardrail_violations).toEqual([]);
    expect(state.last_valid_sequence_id).toBeNull();
    expect(state.last_valid_intensity_values).toBeNull();
  });

  describe("setGuardrailResult", () => {
    it("stores passed result and snapshots intensity values", () => {
      // Set some intensity values first
      useDesignStore.setState({ intensity_values: { shoulder_width: 50 } });

      useDesignStore.getState().setGuardrailResult({
        status: "passed",
        violations: [],
        warnings: [],
        last_valid_sequence_id: null,
      });

      const state = useDesignStore.getState();
      expect(state.guardrail_status).toBe("passed");
      expect(state.guardrail_violations).toEqual([]);
      expect(state.guardrail_warnings).toEqual([]);
      expect(state.last_valid_intensity_values).toEqual({ shoulder_width: 50 });
    });

    it("stores warning result with warnings array", () => {
      useDesignStore.setState({ intensity_values: { shoulder_width: 50 } });

      useDesignStore.getState().setGuardrailResult({
        status: "warning",
        violations: [],
        warnings: [sampleWarning],
        last_valid_sequence_id: null,
      });

      const state = useDesignStore.getState();
      expect(state.guardrail_status).toBe("warning");
      expect(state.guardrail_warnings).toHaveLength(1);
      expect(state.guardrail_warnings[0].constraint_id).toBe("danger_zone_proximity");
      // Warning also snapshots intensity values
      expect(state.last_valid_intensity_values).toEqual({ shoulder_width: 50 });
    });

    it("stores rejected result with violations and does NOT snapshot", () => {
      useDesignStore.setState({
        intensity_values: { shoulder_width: 99 },
        last_valid_intensity_values: { shoulder_width: 50 },
      });

      useDesignStore.getState().setGuardrailResult({
        status: "rejected",
        violations: [sampleViolation],
        warnings: [],
        last_valid_sequence_id: "uuid-abc",
      });

      const state = useDesignStore.getState();
      expect(state.guardrail_status).toBe("rejected");
      expect(state.guardrail_violations).toHaveLength(1);
      expect(state.last_valid_sequence_id).toBe("uuid-abc");
      // Should NOT have overwritten last_valid_intensity_values
      expect(state.last_valid_intensity_values).toEqual({ shoulder_width: 50 });
    });
  });

  describe("snapBackToSafe", () => {
    it("restores intensity values from last valid snapshot", () => {
      useDesignStore.setState({
        intensity_values: { shoulder_width: 99 },
        last_valid_intensity_values: { shoulder_width: 50 },
        guardrail_status: "rejected",
        guardrail_violations: [sampleViolation],
      });

      useDesignStore.getState().snapBackToSafe();

      const state = useDesignStore.getState();
      expect(state.intensity_values).toEqual({ shoulder_width: 50 });
      expect(state.guardrail_status).toBeNull();
      expect(state.guardrail_violations).toEqual([]);
      expect(state.guardrail_warnings).toEqual([]);
    });

    it("does nothing if no last valid snapshot exists", () => {
      useDesignStore.setState({
        intensity_values: { shoulder_width: 99 },
        last_valid_intensity_values: null,
      });

      useDesignStore.getState().snapBackToSafe();

      const state = useDesignStore.getState();
      expect(state.intensity_values).toEqual({ shoulder_width: 99 });
    });
  });

  describe("clearGuardrailState", () => {
    it("resets all guardrail fields to initial values", () => {
      useDesignStore.setState({
        guardrail_status: "rejected",
        guardrail_violations: [sampleViolation],
        guardrail_warnings: [sampleWarning],
        last_valid_sequence_id: "uuid-123",
        last_valid_intensity_values: { shoulder_width: 50 },
      });

      useDesignStore.getState().clearGuardrailState();

      const state = useDesignStore.getState();
      expect(state.guardrail_status).toBeNull();
      expect(state.guardrail_violations).toEqual([]);
      expect(state.guardrail_warnings).toEqual([]);
      expect(state.last_valid_sequence_id).toBeNull();
      expect(state.last_valid_intensity_values).toBeNull();
    });
  });

  describe("clearSession includes guardrail reset", () => {
    it("clearSession resets guardrail state", () => {
      useDesignStore.setState({
        guardrail_status: "warning",
        guardrail_warnings: [sampleWarning],
        last_valid_sequence_id: "uuid-456",
        last_valid_intensity_values: { shoulder_width: 50 },
      });

      useDesignStore.getState().clearSession();

      const state = useDesignStore.getState();
      expect(state.guardrail_status).toBeNull();
      expect(state.guardrail_warnings).toEqual([]);
      expect(state.last_valid_sequence_id).toBeNull();
      expect(state.last_valid_intensity_values).toBeNull();
    });
  });
});
