/**
 * Design Store Tests - Story 2.1, 2.2 & 2.4
 * Tests Zustand store for design session state management.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

import { useDesignStore } from "@/store/designStore";
import type { MasterGeometrySnapshot } from "@/types/inference";
import type { StylePillarResponse } from "@/types/style";

// Test style pillar data (golden_points required per Story 2.2)
const mockTraditionalPillar: StylePillarResponse = {
  id: "traditional",
  name: "Truyền thống",
  description: "Phong cách may đo truyền thống Việt Nam",
  image_url: "/images/styles/traditional.jpg",
  is_default: true,
  sliders: [
    {
      key: "do_rong_vai",
      label: "Độ rộng vai",
      description: "Điều chỉnh độ rộng phần vai",
      min_value: 0,
      max_value: 100,
      default_value: 50,
      step: 5,
      unit: "%",
      golden_points: [38.2, 61.8],
    },
    {
      key: "do_om_than",
      label: "Độ ôm thân",
      description: "Mức độ ôm sát của thân áo",
      min_value: 0,
      max_value: 100,
      default_value: 60,
      step: 5,
      unit: "%",
      golden_points: [50.0, 61.8],
    },
  ],
};

const mockMinimalistPillar: StylePillarResponse = {
  id: "minimalist",
  name: "Tối giản hiện đại",
  description: "Phong cách tối giản, đường cắt sắc nét",
  image_url: "/images/styles/minimalist.jpg",
  is_default: false,
  sliders: [
    {
      key: "do_rong_vai",
      label: "Độ rộng vai",
      description: "Điều chỉnh độ rộng phần vai",
      min_value: 0,
      max_value: 100,
      default_value: 45,
      step: 5,
      unit: "%",
      golden_points: [38.2, 50.0],
    },
    {
      key: "do_om_than",
      label: "Độ ôm thân",
      description: "Mức độ ôm sát của thân áo",
      min_value: 0,
      max_value: 100,
      default_value: 70,
      step: 5,
      unit: "%",
      golden_points: [61.8],
    },
  ],
};

describe("useDesignStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useDesignStore.getState().clearSession();
  });

  describe("Initial State", () => {
    it("should have null selected_pillar initially", () => {
      const { selected_pillar } = useDesignStore.getState();
      expect(selected_pillar).toBeNull();
    });

    it("should have empty intensity_values initially", () => {
      const { intensity_values } = useDesignStore.getState();
      expect(intensity_values).toEqual({});
    });

    it("should have is_pillar_selected as false initially", () => {
      const { is_pillar_selected } = useDesignStore.getState();
      expect(is_pillar_selected).toBe(false);
    });
  });

  describe("selectPillar", () => {
    it("should update selected_pillar when pillar is selected", () => {
      useDesignStore.getState().selectPillar(mockTraditionalPillar);

      const { selected_pillar } = useDesignStore.getState();
      expect(selected_pillar).toEqual(mockTraditionalPillar);
    });

    it("should set is_pillar_selected to true", () => {
      useDesignStore.getState().selectPillar(mockTraditionalPillar);

      const { is_pillar_selected } = useDesignStore.getState();
      expect(is_pillar_selected).toBe(true);
    });

    it("should initialize intensity_values with default values from sliders", () => {
      useDesignStore.getState().selectPillar(mockTraditionalPillar);

      const { intensity_values } = useDesignStore.getState();
      expect(intensity_values).toEqual({
        do_rong_vai: 50,
        do_om_than: 60,
      });
    });

    it("should update intensity_values when selecting different pillar", () => {
      // Select traditional pillar first
      useDesignStore.getState().selectPillar(mockTraditionalPillar);
      expect(useDesignStore.getState().intensity_values).toEqual({
        do_rong_vai: 50,
        do_om_than: 60,
      });

      // Select minimalist pillar - should update to new defaults
      useDesignStore.getState().selectPillar(mockMinimalistPillar);
      expect(useDesignStore.getState().intensity_values).toEqual({
        do_rong_vai: 45,
        do_om_than: 70,
      });
    });
  });

  describe("updateIntensity", () => {
    beforeEach(() => {
      useDesignStore.getState().selectPillar(mockTraditionalPillar);
    });

    it("should update single slider value", () => {
      useDesignStore.getState().updateIntensity("do_rong_vai", 75);

      const { intensity_values } = useDesignStore.getState();
      expect(intensity_values.do_rong_vai).toBe(75);
      expect(intensity_values.do_om_than).toBe(60); // Unchanged
    });

    it("should clamp value to max when exceeding range", () => {
      useDesignStore.getState().updateIntensity("do_rong_vai", 150);

      const { intensity_values } = useDesignStore.getState();
      expect(intensity_values.do_rong_vai).toBe(100); // Clamped to max
    });

    it("should clamp value to min when below range", () => {
      useDesignStore.getState().updateIntensity("do_rong_vai", -50);

      const { intensity_values } = useDesignStore.getState();
      expect(intensity_values.do_rong_vai).toBe(0); // Clamped to min
    });

    it("should not update for unknown slider key", () => {
      const valueBefore = useDesignStore.getState().intensity_values;
      useDesignStore.getState().updateIntensity("unknown_key", 50);

      const { intensity_values } = useDesignStore.getState();
      expect(intensity_values).toEqual(valueBefore);
    });

    it("should not update when no pillar is selected", () => {
      useDesignStore.getState().clearSession();
      useDesignStore.getState().updateIntensity("do_rong_vai", 75);

      const { intensity_values } = useDesignStore.getState();
      expect(intensity_values).toEqual({});
    });
  });

  describe("resetToDefaults", () => {
    beforeEach(() => {
      useDesignStore.getState().selectPillar(mockTraditionalPillar);
    });

    it("should reset all values to defaults", () => {
      // Modify values
      useDesignStore.getState().updateIntensity("do_rong_vai", 80);
      useDesignStore.getState().updateIntensity("do_om_than", 30);

      // Reset
      useDesignStore.getState().resetToDefaults();

      const { intensity_values } = useDesignStore.getState();
      expect(intensity_values).toEqual({
        do_rong_vai: 50,
        do_om_than: 60,
      });
    });

    it("should do nothing when no pillar is selected", () => {
      useDesignStore.getState().clearSession();
      useDesignStore.getState().resetToDefaults();

      const { intensity_values } = useDesignStore.getState();
      expect(intensity_values).toEqual({});
    });
  });

  describe("clearSession", () => {
    it("should reset all state to initial values", () => {
      useDesignStore.getState().selectPillar(mockTraditionalPillar);
      useDesignStore.getState().updateIntensity("do_rong_vai", 80);

      useDesignStore.getState().clearSession();

      const state = useDesignStore.getState();
      expect(state.selected_pillar).toBeNull();
      expect(state.intensity_values).toEqual({});
      expect(state.is_pillar_selected).toBe(false);
    });
  });

  describe("setLoading and setError", () => {
    it("should update loading state", () => {
      useDesignStore.getState().setLoading(true);
      expect(useDesignStore.getState().is_loading_pillars).toBe(true);

      useDesignStore.getState().setLoading(false);
      expect(useDesignStore.getState().is_loading_pillars).toBe(false);
    });

    it("should update error state", () => {
      useDesignStore.getState().setError("Test error");
      expect(useDesignStore.getState().error).toBe("Test error");

      useDesignStore.getState().setError(null);
      expect(useDesignStore.getState().error).toBeNull();
    });
  });

  // Story 2.2: Submission state tests
  describe("setSubmitting (Story 2.2)", () => {
    it("should set is_submitting to true", () => {
      useDesignStore.getState().setSubmitting(true);
      expect(useDesignStore.getState().is_submitting).toBe(true);
    });

    it("should set is_submitting to false", () => {
      useDesignStore.getState().setSubmitting(true);
      useDesignStore.getState().setSubmitting(false);
      expect(useDesignStore.getState().is_submitting).toBe(false);
    });
  });

  describe("setSubmissionResult (Story 2.2)", () => {
    it("should update last_submitted_sequence and clear is_submitting", () => {
      useDesignStore.getState().setSubmitting(true);
      useDesignStore.getState().setSubmissionResult(7, []);

      const state = useDesignStore.getState();
      expect(state.is_submitting).toBe(false);
      expect(state.last_submitted_sequence).toBe(7);
      expect(state.submission_warnings).toEqual([]);
    });

    it("should store submission warnings from backend", () => {
      const mockWarnings = [
        {
          slider_key: "do_om_than",
          message: "Độ ôm thân quá cao có thể gây hạn chế vận động",
          severity: "soft",
        },
      ];
      useDesignStore.getState().setSubmissionResult(3, mockWarnings);

      const { submission_warnings } = useDesignStore.getState();
      expect(submission_warnings).toHaveLength(1);
      expect(submission_warnings[0].slider_key).toBe("do_om_than");
    });

    it("should clear warnings on selectPillar", () => {
      const mockWarnings = [
        { slider_key: "do_om_than", message: "Warning", severity: "soft" },
      ];
      useDesignStore.getState().setSubmissionResult(1, mockWarnings);
      useDesignStore.getState().selectPillar(mockTraditionalPillar);

      expect(useDesignStore.getState().submission_warnings).toEqual([]);
    });

    it("should clear warnings on resetToDefaults", () => {
      useDesignStore.getState().selectPillar(mockTraditionalPillar);
      const mockWarnings = [
        { slider_key: "do_om_than", message: "Warning", severity: "soft" },
      ];
      useDesignStore.getState().setSubmissionResult(1, mockWarnings);
      useDesignStore.getState().resetToDefaults();

      expect(useDesignStore.getState().submission_warnings).toEqual([]);
    });

    it("should reset all submission state on clearSession", () => {
      useDesignStore.getState().setSubmitting(true);
      useDesignStore.getState().setSubmissionResult(5, [
        { slider_key: "do_om_than", message: "Warning", severity: "soft" },
      ]);

      useDesignStore.getState().clearSession();

      const state = useDesignStore.getState();
      expect(state.is_submitting).toBe(false);
      expect(state.last_submitted_sequence).toBe(0);
      expect(state.submission_warnings).toEqual([]);
    });
  });

  // Story 2.4: Master Geometry translation state tests
  describe("setMasterGeometry (Story 2.4)", () => {
    const mockSnapshot: MasterGeometrySnapshot = {
      sequence_id: 1,
      base_hash: "a".repeat(64),
      algorithm_version: "1.0.0-mvp",
      deltas: [
        { key: "do_cu_eo", value: 1.5, unit: "cm", label_vi: "Độ cử eo" },
        { key: "ha_nach", value: -0.8, unit: "cm", label_vi: "Hạ nách" },
      ],
      geometry_hash: "b".repeat(64),
      created_at: "2024-01-15T10:30:00Z",
    };

    it("should set master_geometry snapshot", () => {
      useDesignStore.getState().setMasterGeometry(mockSnapshot);

      const { master_geometry } = useDesignStore.getState();
      expect(master_geometry).toEqual(mockSnapshot);
    });

    it("should clear is_translating when setting snapshot", () => {
      useDesignStore.getState().setTranslating(true);
      useDesignStore.getState().setMasterGeometry(mockSnapshot);

      expect(useDesignStore.getState().is_translating).toBe(false);
    });

    it("should clear translate_error when setting snapshot", () => {
      useDesignStore.getState().setTranslateError("Previous error");
      useDesignStore.getState().setMasterGeometry(mockSnapshot);

      expect(useDesignStore.getState().translate_error).toBeNull();
    });

    it("should allow setting master_geometry to null", () => {
      useDesignStore.getState().setMasterGeometry(mockSnapshot);
      useDesignStore.getState().setMasterGeometry(null);

      expect(useDesignStore.getState().master_geometry).toBeNull();
    });
  });

  describe("setTranslating (Story 2.4)", () => {
    it("should set is_translating to true", () => {
      useDesignStore.getState().setTranslating(true);
      expect(useDesignStore.getState().is_translating).toBe(true);
    });

    it("should set is_translating to false", () => {
      useDesignStore.getState().setTranslating(true);
      useDesignStore.getState().setTranslating(false);
      expect(useDesignStore.getState().is_translating).toBe(false);
    });
  });

  describe("setTranslateError (Story 2.4)", () => {
    it("should set translate_error message", () => {
      useDesignStore.getState().setTranslateError("Lỗi kết nối với máy chủ");

      expect(useDesignStore.getState().translate_error).toBe(
        "Lỗi kết nối với máy chủ"
      );
    });

    it("should clear is_translating when setting error", () => {
      useDesignStore.getState().setTranslating(true);
      useDesignStore.getState().setTranslateError("Error");

      expect(useDesignStore.getState().is_translating).toBe(false);
    });

    it("should clear master_geometry when setting error", () => {
      const mockSnapshot: MasterGeometrySnapshot = {
        sequence_id: 1,
        base_hash: "a".repeat(64),
        algorithm_version: "1.0.0-mvp",
        deltas: [],
        geometry_hash: "b".repeat(64),
        created_at: "2024-01-15T10:30:00Z",
      };
      useDesignStore.getState().setMasterGeometry(mockSnapshot);
      useDesignStore.getState().setTranslateError("Error");

      expect(useDesignStore.getState().master_geometry).toBeNull();
    });

    it("should allow clearing translate_error", () => {
      useDesignStore.getState().setTranslateError("Error");
      useDesignStore.getState().setTranslateError(null);

      expect(useDesignStore.getState().translate_error).toBeNull();
    });
  });

  describe("clearMasterGeometry (Story 2.4)", () => {
    it("should reset all master geometry state", () => {
      const mockSnapshot: MasterGeometrySnapshot = {
        sequence_id: 1,
        base_hash: "a".repeat(64),
        algorithm_version: "1.0.0-mvp",
        deltas: [],
        geometry_hash: "b".repeat(64),
        created_at: "2024-01-15T10:30:00Z",
      };
      useDesignStore.getState().setMasterGeometry(mockSnapshot);
      useDesignStore.getState().setTranslating(true);
      useDesignStore.getState().setTranslateError("Error");

      useDesignStore.getState().clearMasterGeometry();

      const state = useDesignStore.getState();
      expect(state.master_geometry).toBeNull();
      expect(state.is_translating).toBe(false);
      expect(state.translate_error).toBeNull();
    });
  });

  describe("clearSession resets Story 2.4 state", () => {
    it("should reset master_geometry state on clearSession", () => {
      const mockSnapshot: MasterGeometrySnapshot = {
        sequence_id: 1,
        base_hash: "a".repeat(64),
        algorithm_version: "1.0.0-mvp",
        deltas: [
          { key: "do_cu_eo", value: 1.0, unit: "cm", label_vi: "Độ cử eo" },
        ],
        geometry_hash: "b".repeat(64),
        created_at: "2024-01-15T10:30:00Z",
      };
      useDesignStore.getState().setMasterGeometry(mockSnapshot);
      useDesignStore.getState().setTranslating(true);

      useDesignStore.getState().clearSession();

      const state = useDesignStore.getState();
      expect(state.master_geometry).toBeNull();
      expect(state.is_translating).toBe(false);
      expect(state.translate_error).toBeNull();
    });
  });
});
