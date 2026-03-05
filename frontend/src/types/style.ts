/**
 * Style Pillar Types - TypeScript types and Zod schemas
 * Story 2.1 & 2.2: Lựa chọn & Tinh chỉnh Trụ cột Phong cách
 *
 * Uses snake_case for API field names to match Backend SSOT.
 */

import { z } from "zod";
import type { FabricResponse } from "@/types/fabric";
import type { MasterGeometrySnapshot } from "@/types/inference";

// ===== Intensity Slider Types =====

/**
 * Configuration for a style intensity slider (FR2).
 * Backend provides min/max/default values and golden_points (SSOT).
 */
export interface IntensitySlider {
  key: string;
  label: string;
  description: string | null;
  min_value: number;
  max_value: number;
  default_value: number;
  step: number;
  unit: string | null;
  /** Artisan golden ratio positions for Haptic Golden Points UI (Story 2.2) */
  golden_points: number[];
}

/**
 * Schema for slider value validation
 */
export const sliderValueSchema = z.object({
  key: z.string(),
  value: z.number(),
});

export type SliderValue = z.infer<typeof sliderValueSchema>;

// ===== Style Pillar Types =====

/**
 * Style Pillar response from API (FR1).
 * Represents a design style with its intensity sliders.
 */
export interface StylePillarResponse {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  sliders: IntensitySlider[];
  is_default: boolean;
}

/**
 * List of style pillars response
 */
export interface StylePillarListResponse {
  pillars: StylePillarResponse[];
  total: number;
}

// ===== Story 2.2: Intensity Submission Types =====

/**
 * A single slider key-value pair for backend submission (Story 2.2).
 */
export interface IntensityValueItem {
  key: string;
  value: number;
}

/**
 * Request payload for submitting intensity values to backend (Story 2.2).
 */
export interface IntensitySubmitRequest {
  pillar_id: string;
  intensities: IntensityValueItem[];
  sequence_id: number;
}

/**
 * Zod schema for validating intensity submission response from backend.
 */
export const intensityWarningSchema = z.object({
  slider_key: z.string(),
  message: z.string(),
  severity: z.string(),
});

export const intensitySubmitResponseSchema = z.object({
  success: z.boolean(),
  sequence_id: z.number(),
  warnings: z.array(intensityWarningSchema),
  error: z.string().nullish(),
});

export type IntensityWarning = z.infer<typeof intensityWarningSchema>;
export type IntensitySubmitResponse = z.infer<typeof intensitySubmitResponseSchema>;

// ===== Design Session State Types =====

/**
 * Current intensity values for sliders.
 * Key is slider key, value is current position.
 */
export interface IntensityValues {
  [key: string]: number;
}

/**
 * Design session state for Zustand store.
 */
export interface DesignSessionState {
  // Selected style pillar
  selected_pillar: StylePillarResponse | null;

  // Current intensity values for sliders
  intensity_values: IntensityValues;

  // Loading states
  is_loading_pillars: boolean;
  is_pillar_selected: boolean;

  // Story 2.2: Submission state
  is_submitting: boolean;
  last_submitted_sequence: number;
  submission_warnings: IntensityWarning[];

  // Story 2.3: Fabric recommendation state
  fabric_recommendations: FabricResponse[];
  is_loading_fabrics: boolean;

  // Story 2.4: Master Geometry translation state
  master_geometry: MasterGeometrySnapshot | null;
  is_translating: boolean;
  translate_error: string | null;

  // Error state
  error: string | null;
}

/**
 * Design session actions for Zustand store.
 */
export interface DesignSessionActions {
  // Select a style pillar and initialize sliders
  selectPillar: (pillar: StylePillarResponse) => void;

  // Update a single slider value
  updateIntensity: (key: string, value: number) => void;

  // Reset all sliders to default values
  resetToDefaults: () => void;

  // Set loading state
  setLoading: (loading: boolean) => void;

  // Set error state
  setError: (error: string | null) => void;

  // Clear session
  clearSession: () => void;

  // Story 2.2: Submission state management
  setSubmitting: (loading: boolean) => void;
  setSubmissionResult: (sequenceId: number, warnings: IntensityWarning[]) => void;

  // Story 2.3: Fabric recommendation actions
  setFabricRecommendations: (fabrics: FabricResponse[]) => void;
  setLoadingFabrics: (loading: boolean) => void;
  clearFabricRecommendations: () => void;

  // Story 2.4: Master Geometry translation actions
  setMasterGeometry: (snapshot: MasterGeometrySnapshot | null) => void;
  setTranslating: (loading: boolean) => void;
  setTranslateError: (error: string | null) => void;
  clearMasterGeometry: () => void;
}

/**
 * Complete design store type
 */
export type DesignStore = DesignSessionState & DesignSessionActions;
