/**
 * Pattern Session Types and Zod Schemas
 * Story 11.4: Profile-Driven Measurement Form UI
 *
 * Defines types for pattern generation workflow:
 * - 10 measurement fields with Vietnamese labels
 * - Validation ranges for each measurement
 * - Pattern session create/response schemas
 */

import { z } from "zod";

// ===== Measurement Validation Ranges (AC #6) =====

export const MEASUREMENT_RANGES = {
  do_dai_ao: { min: 30, max: 200, label: "Độ dài áo" },
  ha_eo: { min: 5, max: 50, label: "Hạ eo" },
  vong_co: { min: 20, max: 60, label: "Vòng cổ" },
  vong_nach: { min: 30, max: 80, label: "Vòng nách" },
  vong_nguc: { min: 60, max: 150, label: "Vòng ngực" },
  vong_eo: { min: 50, max: 140, label: "Vòng eo" },
  vong_mong: { min: 60, max: 160, label: "Vòng mông" },
  do_dai_tay: { min: 30, max: 100, label: "Độ dài tay" },
  vong_bap_tay: { min: 15, max: 60, label: "Vòng bắp tay" },
  vong_co_tay: { min: 10, max: 40, label: "Vòng cổ tay" },
} as const;

export type MeasurementKey = keyof typeof MEASUREMENT_RANGES;

// ===== Pattern Measurement Fields Configuration (AC #4) =====

export const PATTERN_MEASUREMENT_FIELDS: Array<{
  key: MeasurementKey;
  label: string;
  description: string;
}> = [
  { key: "do_dai_ao", label: "Độ dài áo", description: "Body length (cm)" },
  { key: "ha_eo", label: "Hạ eo", description: "Waist drop (cm)" },
  { key: "vong_co", label: "Vòng cổ", description: "Neck circumference (cm)" },
  { key: "vong_nach", label: "Vòng nách", description: "Armhole circumference (cm)" },
  { key: "vong_nguc", label: "Vòng ngực", description: "Bust circumference (cm)" },
  { key: "vong_eo", label: "Vòng eo", description: "Waist circumference (cm)" },
  { key: "vong_mong", label: "Vòng mông", description: "Hip circumference (cm)" },
  { key: "do_dai_tay", label: "Độ dài tay", description: "Sleeve length (cm)" },
  { key: "vong_bap_tay", label: "Vòng bắp tay", description: "Bicep circumference (cm)" },
  { key: "vong_co_tay", label: "Vòng cổ tay", description: "Wrist circumference (cm)" },
];

// ===== Zod Schema for Measurement Validation =====

/**
 * Create a measurement field schema with Vietnamese error messages (AC #6)
 */
const createMeasurementField = (key: MeasurementKey) => {
  const { min, max, label } = MEASUREMENT_RANGES[key];
  return z
    .number({ message: `${label} phải là số` })
    .min(min, `${label} phải từ ${min} đến ${max} cm`)
    .max(max, `${label} phải từ ${min} đến ${max} cm`);
};

/**
 * Schema for 10 pattern measurement fields
 */
export const PatternMeasurementSchema = z.object({
  do_dai_ao: createMeasurementField("do_dai_ao"),
  ha_eo: createMeasurementField("ha_eo"),
  vong_co: createMeasurementField("vong_co"),
  vong_nach: createMeasurementField("vong_nach"),
  vong_nguc: createMeasurementField("vong_nguc"),
  vong_eo: createMeasurementField("vong_eo"),
  vong_mong: createMeasurementField("vong_mong"),
  do_dai_tay: createMeasurementField("do_dai_tay"),
  vong_bap_tay: createMeasurementField("vong_bap_tay"),
  vong_co_tay: createMeasurementField("vong_co_tay"),
});

export type PatternMeasurementInput = z.infer<typeof PatternMeasurementSchema>;

// ===== Pattern Session Create Schema (AC #7) =====

export const PatternSessionCreateSchema = z.object({
  customer_id: z.string().uuid().nullable(),
  garment_type: z.string().default("ao_dai"),
  notes: z.string().optional(),
  // Spread measurement fields
  ...PatternMeasurementSchema.shape,
});

export type PatternSessionCreate = z.infer<typeof PatternSessionCreateSchema>;

// ===== Pattern Session Response Types =====

export interface PatternSessionResponse {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  garment_type: string;
  status: "draft" | "completed" | "exported";
  do_dai_ao: number;
  ha_eo: number;
  vong_co: number;
  vong_nach: number;
  vong_nguc: number;
  vong_eo: number;
  vong_mong: number;
  do_dai_tay: number;
  vong_bap_tay: number;
  vong_co_tay: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ===== Customer Measurement Mapping =====

/**
 * Map customer measurement fields to pattern session fields
 * Some pattern fields don't have customer measurement equivalents
 */
export const CUSTOMER_TO_PATTERN_MAPPING: Record<string, MeasurementKey | null> = {
  top_length: "do_dai_ao",
  neck: "vong_co",
  bust: "vong_nguc",
  waist: "vong_eo",
  hip: "vong_mong",
  sleeve_length: "do_dai_tay",
  wrist: "vong_co_tay",
  // Fields that need manual input (no customer measurement equivalent)
  // ha_eo: null (waist drop - specific to pattern)
  // vong_nach: null (armhole - calculated or manual)
  // vong_bap_tay: null (bicep - not in standard customer measurement)
};

/**
 * Reverse mapping: pattern field → customer measurement field
 */
export const PATTERN_TO_CUSTOMER_MAPPING: Record<MeasurementKey, string | null> = {
  do_dai_ao: "top_length",
  ha_eo: null, // Manual input required
  vong_co: "neck",
  vong_nach: null, // Manual input required
  vong_nguc: "bust",
  vong_eo: "waist",
  vong_mong: "hip",
  do_dai_tay: "sleeve_length",
  vong_bap_tay: null, // Manual input required
  vong_co_tay: "wrist",
};
