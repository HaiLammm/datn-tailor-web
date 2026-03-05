/**
 * Inference Types - TypeScript types and Zod schemas
 * Story 2.4: Dịch thuật Cảm xúc sang Ease Delta (Emotional Compiler Engine)
 *
 * Uses snake_case for API field names to match Backend SSOT.
 */

import { z } from "zod";

// ===== Delta Value Types =====

/**
 * A single geometric delta value.
 * Represents an adjustment to a specific measurement dimension.
 * All labels use Vietnamese tailoring terminology (NFR11).
 */
export interface DeltaValue {
  /** Delta identifier in Vietnamese (e.g., 'do_cu_eo', 'ha_nach') */
  key: string;
  /** Delta value - positive for increase, negative for decrease */
  value: number;
  /** Unit of measurement (typically 'cm' for geometric deltas) */
  unit: string;
  /** Vietnamese display label for the delta (e.g., 'Độ cử eo') */
  label_vi: string;
}

/**
 * Zod schema for DeltaValue validation
 */
export const deltaValueSchema = z.object({
  key: z.string(),
  value: z.number(),
  unit: z.string(),
  label_vi: z.string(),
});

// ===== Master Geometry Snapshot Types =====

/**
 * Immutable snapshot of geometry state.
 * This is the core output of the Emotional Compiler.
 * Contains all Deltas needed to transform the base pattern.
 * Follows architecture.md Geometry & Constraint Architecture.
 */
export interface MasterGeometrySnapshot {
  /** Sequence ID from the original request for concurrency control */
  sequence_id: number;
  /** Hash of the base measurement data (placeholder for MVP) */
  base_hash: string;
  /** Version of the delta computation algorithm */
  algorithm_version: string;
  /** List of computed geometric deltas */
  deltas: DeltaValue[];
  /** Deterministic hash of deltas for integrity verification */
  geometry_hash: string;
  /** ISO timestamp when snapshot was created */
  created_at: string;
}

/**
 * Zod schema for MasterGeometrySnapshot validation
 */
export const masterGeometrySnapshotSchema = z.object({
  sequence_id: z.number().int().nonnegative(),
  base_hash: z.string().length(64), // SHA-256 hex
  algorithm_version: z.string(),
  deltas: z.array(deltaValueSchema),
  geometry_hash: z.string().length(64), // SHA-256 hex
  created_at: z.string(),
});

// ===== Translate Request Types =====

/**
 * Intensity value item for translation request.
 * Matches Backend IntensityValueItem model.
 */
export interface IntensityValueItem {
  key: string;
  value: number;
}

/**
 * Request schema for translating style to geometry.
 * Input to the Emotional Compiler Engine.
 */
export interface TranslateRequest {
  /** ID of the selected style pillar (e.g., 'traditional', 'minimalist') */
  pillar_id: string;
  /** List of slider key-value pairs representing current intensities */
  intensities: IntensityValueItem[];
  /** Sequence ID for concurrency control */
  sequence_id: number;
  /** ID of base measurement profile (optional for MVP) */
  base_measurement_id?: string | null;
}

/**
 * Zod schema for TranslateRequest validation (client-side)
 */
export const translateRequestSchema = z.object({
  pillar_id: z.string().min(1),
  intensities: z.array(
    z.object({
      key: z.string(),
      value: z.number(),
    })
  ),
  sequence_id: z.number().int().nonnegative(),
  base_measurement_id: z.string().nullable().optional(),
});

// ===== Translate Response Types =====

/**
 * Response schema from the Emotional Compiler.
 * Contains the computed Master Geometry Snapshot or error information.
 * Includes inference timing for NFR1 performance monitoring.
 */
export interface TranslateResponse {
  /** Whether the translation was successful */
  success: boolean;
  /** The computed Master Geometry Snapshot (null if error) */
  snapshot: MasterGeometrySnapshot | null;
  /** Time taken for inference in milliseconds (NFR1: must be < 15000) */
  inference_time_ms: number;
  /** Vietnamese error message if success=False */
  error: string | null;
}

/**
 * Zod schema for TranslateResponse validation
 */
export const translateResponseSchema = z.object({
  success: z.boolean(),
  snapshot: masterGeometrySnapshotSchema.nullable(),
  inference_time_ms: z.number().int().nonnegative(),
  error: z.string().nullable(),
});

// ===== Type exports =====

export type DeltaValueType = z.infer<typeof deltaValueSchema>;
export type MasterGeometrySnapshotType = z.infer<
  typeof masterGeometrySnapshotSchema
>;
export type TranslateRequestType = z.infer<typeof translateRequestSchema>;
export type TranslateResponseType = z.infer<typeof translateResponseSchema>;
