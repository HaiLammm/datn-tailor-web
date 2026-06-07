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

// ===== Sleeve type (FR91a, Story 11.7) =====
export type SleeveType = "raglan" | "set_in";

export const SLEEVE_TYPE_LABELS: Record<SleeveType, string> = {
  raglan: "Tay liền cổ (raglan)",
  set_in: "Tay tra (có đường may vai)",
};

// ===== Extended measurements (Story 11.8) — optional, by style =====
export const EXTENDED_MEASUREMENT_RANGES = {
  ha_ben_nguc: { min: 15, max: 35, label: "Hạ ben ngực" },
  dang_nguc: { min: 10, max: 25, label: "Dang ngực" },
  ha_mong: { min: 10, max: 30, label: "Hạ mông" },
  xuoi_vai: { min: 1, max: 8, label: "Xuôi vai" },
  rong_vai: { min: 28, max: 50, label: "Rộng vai" },
} as const;

export type ExtendedMeasurementKey = keyof typeof EXTENDED_MEASUREMENT_RANGES;

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

const optionalExtended = (key: ExtendedMeasurementKey) => {
  const { min, max, label } = EXTENDED_MEASUREMENT_RANGES[key];
  return z
    .number()
    .min(min, `${label} phải từ ${min} đến ${max} cm`)
    .max(max, `${label} phải từ ${min} đến ${max} cm`)
    .optional();
};

export const PatternSessionCreateSchema = z.object({
  customer_id: z.string().uuid().nullable(),
  garment_type: z.string().default("ao_dai"),
  sleeve_type: z.enum(["raglan", "set_in"]).default("raglan"),
  notes: z.string().optional(),
  // Spread the 10 required measurement fields
  ...PatternMeasurementSchema.shape,
  // 5 optional extended measurements (Story 11.8)
  ha_ben_nguc: optionalExtended("ha_ben_nguc"),
  dang_nguc: optionalExtended("dang_nguc"),
  ha_mong: optionalExtended("ha_mong"),
  xuoi_vai: optionalExtended("xuoi_vai"),
  rong_vai: optionalExtended("rong_vai"),
});

export type PatternSessionCreate = z.infer<typeof PatternSessionCreateSchema>;

// ===== Pattern Pieces =====

export type PieceType = "front_bodice" | "back_bodice" | "sleeve" | "collar";

export type ExportFormat = "svg" | "gcode";

export interface PatternPieceResponse {
  id: string;
  session_id: string;
  piece_type: PieceType;
  svg_data: string | null;
  geometry_params: Record<string, unknown> | null;
  created_at: string;
}

// ===== Pattern Session Response Types =====

export interface PatternSessionResponse {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  created_by: string;
  garment_type: string;
  sleeve_type: SleeveType;
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
  ha_ben_nguc: number | null;
  dang_nguc: number | null;
  ha_mong: number | null;
  xuoi_vai: number | null;
  rong_vai: number | null;
  notes: string | null;
  pieces: PatternPieceResponse[];
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
  ha_eo: "ha_eo",
  neck: "vong_co",
  vong_nach: "vong_nach",
  bust: "vong_nguc",
  waist: "vong_eo",
  hip: "vong_mong",
  sleeve_length: "do_dai_tay",
  vong_bap_tay: "vong_bap_tay",
  wrist: "vong_co_tay",
};

/**
 * Reverse mapping: pattern field → customer measurement field
 */
export const PATTERN_TO_CUSTOMER_MAPPING: Record<MeasurementKey, string | null> = {
  do_dai_ao: "top_length",
  ha_eo: "ha_eo",
  vong_co: "neck",
  vong_nach: "vong_nach",
  vong_nguc: "bust",
  vong_eo: "waist",
  vong_mong: "hip",
  do_dai_tay: "sleeve_length",
  vong_bap_tay: "vong_bap_tay",
  vong_co_tay: "wrist",
};

export interface PatternSessionListItem {
  id: string;
  status: "draft" | "completed" | "exported";
  garment_type: string;
  piece_count: number;
  created_at: string;
}

export const PIECE_TYPE_LABELS: Record<PieceType, string> = {
  front_bodice: "Thân trước",
  back_bodice: "Thân sau",
  sleeve: "Tay áo",
  collar: "Lá cổ",
};

export const PATTERN_SESSION_STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  completed: "Hoàn thành",
  exported: "Đã xuất",
};

export const GEOMETRY_PARAM_LABELS: Record<string, string> = {
  length: "Dài",
  bust_width: "Rộng ngực",
  waist_width: "Rộng eo",
  hip_width: "Rộng mông",
  hem_width: "Rộng tà",
  neck_width: "Rộng cổ",
  neck_depth: "Sâu cổ",
  armhole_drop: "Hạ nách",
  sleeve_length: "Dài tay",
  bicep_width: "Rộng bắp tay",
  underarm_width: "Rộng nách tay",
  wrist_width: "Cửa tay",
  cap_height: "Cao đầu tay",
  cap_ease: "Cử động đầu tay",
  band: "Bản cổ",
  neck_perimeter: "Chu vi cổ",
};

// ===== Story 11.6: Attach Pattern Types =====

export interface AttachPatternRequest {
  pattern_session_id: string | null;
}

export interface AttachPatternResponse {
  order_id: string;
  pattern_session_id: string | null;
}

// Keys aligned with the actual engine output (SCP 2026-06-08). The sleeve list covers
// both raglan and set-in fields; only the present ones render.
export const PIECE_GEOMETRY_PARAM_KEYS: Record<PieceType, string[]> = {
  front_bodice: ["length", "bust_width", "waist_width", "hip_width", "hem_width", "neck_width", "neck_depth", "armhole_drop"],
  back_bodice: ["length", "bust_width", "waist_width", "hip_width", "hem_width", "neck_width", "armhole_drop"],
  sleeve: ["sleeve_length", "bicep_width", "underarm_width", "wrist_width", "armhole_drop", "cap_height", "cap_ease"],
  collar: ["length", "band", "neck_perimeter"],
};
