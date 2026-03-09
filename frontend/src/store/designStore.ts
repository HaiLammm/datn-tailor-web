/**
 * Design Session Store - Zustand state management
 * Story 2.1, 2.2, 2.3 & 2.4: Phong cách, Cường độ, Gợi ý Vải & Master Geometry
 *
 * Manages selected style pillar, intensity slider values,
 * backend submission state, fabric recommendations, and master geometry translation.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { FabricResponse } from "@/types/fabric";
import type { MasterGeometry, MorphDelta, ConstraintViolation } from "@/types/geometry";
import type { MasterGeometrySnapshot } from "@/types/inference";
import type {
  DesignStore,
  IntensityValues,
  IntensityWarning,
  StylePillarResponse,
} from "@/types/style";

/**
 * Initialize intensity values from pillar sliders.
 * Uses default_value from each slider.
 */
const initializeIntensityValues = (
  pillar: StylePillarResponse
): IntensityValues => {
  const values: IntensityValues = {};
  for (const slider of pillar.sliders) {
    values[slider.key] = slider.default_value;
  }
  return values;
};

/**
 * Design Session Store
 *
 * Manages:
 * - Selected style pillar (FR1)
 * - Intensity slider values (FR2, Story 2.2)
 * - Backend submission state with sequence_id (Story 2.2)
 */
export const useDesignStore = create<DesignStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      selected_pillar: null,
      intensity_values: {},
      is_loading_pillars: false,
      is_pillar_selected: false,
      is_submitting: false,
      last_submitted_sequence: 0,
      submission_warnings: [],
      error: null,

      // Story 2.3: Fabric recommendation state
      fabric_recommendations: [],
      is_loading_fabrics: false,

      // Story 2.4: Master Geometry translation state
      master_geometry: null,
      current_pattern: null,
      is_translating: false,
      translate_error: null,

      // Story 3.2: Current morph delta
      current_morph_delta: null,

      // Story 3.3: Comparison Overlay state
      is_comparison_mode: false,

      // Story 3.4: Lock Design state
      is_design_locked: false,
      is_locking: false,
      lock_error: null,
      locked_design_id: null,
      locked_geometry_hash: null,

      // Story 4.1b: Guardrail state
      guardrail_status: null,
      guardrail_warnings: [],
      guardrail_violations: [],
      last_valid_sequence_id: null,
      last_valid_intensity_values: null,

      // Select a style pillar and initialize sliders with defaults
      selectPillar: (pillar: StylePillarResponse) => {
        const intensityValues = initializeIntensityValues(pillar);

        set(
          {
            selected_pillar: pillar,
            intensity_values: intensityValues,
            is_pillar_selected: true,
            submission_warnings: [],
            error: null,
          },
          false,
          "selectPillar"
        );
      },

      // Update a single slider value
      updateIntensity: (key: string, value: number) => {
        const { selected_pillar, intensity_values } = get();

        if (!selected_pillar) {
          return;
        }

        // Find the slider to validate bounds
        const slider = selected_pillar.sliders.find((s) => s.key === key);
        if (!slider) {
          return;
        }

        // Clamp value to valid range
        const clampedValue = Math.max(
          slider.min_value,
          Math.min(slider.max_value, value)
        );

        set(
          {
            intensity_values: {
              ...intensity_values,
              [key]: clampedValue,
            },
          },
          false,
          "updateIntensity"
        );
      },

      // Reset all sliders to default values
      resetToDefaults: () => {
        const { selected_pillar } = get();

        if (!selected_pillar) {
          return;
        }

        const defaultValues = initializeIntensityValues(selected_pillar);

        set(
          {
            intensity_values: defaultValues,
            submission_warnings: [],
          },
          false,
          "resetToDefaults"
        );
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set(
          {
            is_loading_pillars: loading,
          },
          false,
          "setLoading"
        );
      },

      // Set error state
      setError: (error: string | null) => {
        set(
          {
            error,
          },
          false,
          "setError"
        );
      },

      /** Story 2.3: Set fabric recommendations from backend response. */
      setFabricRecommendations: (fabrics: FabricResponse[]) => {
        set(
          { fabric_recommendations: fabrics, is_loading_fabrics: false },
          false,
          "setFabricRecommendations"
        );
      },

      /** Story 2.3: Set fabric loading state. */
      setLoadingFabrics: (loading: boolean) => {
        set({ is_loading_fabrics: loading }, false, "setLoadingFabrics");
      },

      /** Story 2.3: Clear fabric recommendations. */
      clearFabricRecommendations: () => {
        set(
          { fabric_recommendations: [], is_loading_fabrics: false },
          false,
          "clearFabricRecommendations"
        );
      },

      /** Story 2.4: Set master geometry snapshot from translation response. */
      setMasterGeometry: (snapshot: MasterGeometrySnapshot | null) => {
        set(
          {
            master_geometry: snapshot,
            is_translating: false,
            translate_error: null,
          },
          false,
          "setMasterGeometry"
        );
      },

      /** Story 3.1: Set current visual pattern from backend or updates. */
      setCurrentPattern: (pattern: MasterGeometry | null) => {
        set(
          {
            current_pattern: pattern,
          },
          false,
          "setCurrentPattern"
        );
      },

      /** Story 2.4: Set translation loading state. */
      setTranslating: (loading: boolean) => {
        set({ is_translating: loading }, false, "setTranslating");
      },

      /** Story 2.4: Set translation error. */
      setTranslateError: (error: string | null) => {
        set(
          {
            translate_error: error,
            is_translating: false,
            master_geometry: null,
          },
          false,
          "setTranslateError"
        );
      },

      /** Story 2.4: Clear master geometry state. */
      clearMasterGeometry: () => {
        set(
          {
            master_geometry: null,
            is_translating: false,
            translate_error: null,
          },
          false,
          "clearMasterGeometry"
        );
      },

      /** Story 3.2: Set current morph delta. */
      setCurrentMorphDelta: (delta: MorphDelta | null) => {
        set({ current_morph_delta: delta }, false, "setCurrentMorphDelta");
      },

      /** Story 3.3: Toggle comparison overlay. */
      toggleComparisonMode: () => {
        set(
          (state) => ({ is_comparison_mode: !state.is_comparison_mode }),
          false,
          "toggleComparisonMode"
        );
      },

      /** Story 3.4: Set locking state. */
      setLocking: (loading: boolean) => {
        set({ is_locking: loading, lock_error: null }, false, "setLocking");
      },

      /** Story 3.4: Set lock result on success. */
      setLockResult: (designId: string, geometryHash: string) => {
        set(
          {
            is_locking: false,
            is_design_locked: true,
            locked_design_id: designId,
            locked_geometry_hash: geometryHash,
            lock_error: null,
          },
          false,
          "setLockResult"
        );
      },

      /** Story 3.4: Set lock error. */
      setLockError: (error: string | null) => {
        set(
          { is_locking: false, lock_error: error },
          false,
          "setLockError"
        );
      },

      /** Story 4.1b: Set guardrail check result. Snapshot intensity_values on pass. */
      setGuardrailResult: (result: { status: "passed" | "warning" | "rejected"; violations: ConstraintViolation[]; warnings: ConstraintViolation[]; last_valid_sequence_id: string | null }) => {
        const updates: Record<string, unknown> = {
          guardrail_status: result.status,
          guardrail_warnings: result.warnings,
          guardrail_violations: result.violations,
          last_valid_sequence_id: result.last_valid_sequence_id,
        };
        // Snapshot current values as safe on pass or warning
        if (result.status === "passed" || result.status === "warning") {
          updates.last_valid_intensity_values = { ...get().intensity_values };
        }
        set(updates as Partial<DesignStore>, false, "setGuardrailResult");
      },

      /** Story 4.1b: Snap back sliders to last valid state. */
      snapBackToSafe: () => {
        const { last_valid_intensity_values } = get();
        if (last_valid_intensity_values) {
          set(
            {
              intensity_values: { ...last_valid_intensity_values },
              guardrail_status: null,
              guardrail_violations: [],
              guardrail_warnings: [],
            },
            false,
            "snapBackToSafe"
          );
        }
      },

      /** Story 4.1b: Clear all guardrail state. */
      clearGuardrailState: () => {
        set(
          {
            guardrail_status: null,
            guardrail_warnings: [],
            guardrail_violations: [],
            last_valid_sequence_id: null,
            last_valid_intensity_values: null,
          },
          false,
          "clearGuardrailState"
        );
      },

      // Clear entire session
      clearSession: () => {
        set(
          {
            selected_pillar: null,
            intensity_values: {},
            is_pillar_selected: false,
            is_submitting: false,
            last_submitted_sequence: 0,
            submission_warnings: [],
            error: null,
            fabric_recommendations: [],
            is_loading_fabrics: false,
            // Story 2.4
            master_geometry: null,
            current_pattern: null,
            is_translating: false,
            translate_error: null,
            // Story 3.2
            current_morph_delta: null,
            // Story 3.3
            is_comparison_mode: false,
            // Story 3.4
            is_design_locked: false,
            is_locking: false,
            lock_error: null,
            locked_design_id: null,
            locked_geometry_hash: null,
            // Story 4.1b
            guardrail_status: null,
            guardrail_warnings: [],
            guardrail_violations: [],
            last_valid_sequence_id: null,
            last_valid_intensity_values: null,
          },
          false,
          "clearSession"
        );
      },

      /** Story 2.2: Mark intensity submission in-flight.
       * @param loading - true when request is in-flight, false when complete
       */
      setSubmitting: (loading: boolean) => {
        set(
          {
            is_submitting: loading,
          },
          false,
          "setSubmitting"
        );
      },

      /** Story 2.2: Record result from backend after intensity submission.
       * Clears is_submitting and stores returned warnings.
       * @param sequenceId - sequence_id echoed by backend
       * @param warnings - soft constraint warnings from backend (may be empty)
       */
      setSubmissionResult: (sequenceId: number, warnings: IntensityWarning[]) => {
        set(
          {
            is_submitting: false,
            last_submitted_sequence: sequenceId,
            submission_warnings: warnings,
          },
          false,
          "setSubmissionResult"
        );
      },
    }),
    {
      name: "design-store",
    }
  )
);
