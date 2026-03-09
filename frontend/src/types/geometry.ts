/**
 * Geometry types matching Backend Pydantic models (SSOT).
 * Story 3.1
 */

export interface Point {
  x: number;
  y: number;
}

export interface CurveControl {
  cp1: Point;
  cp2?: Point | null;
}

export interface Segment {
  type: "line" | "curve" | "move";
  to: Point;
  control?: CurveControl | null;
}

export interface Path {
  id: string;
  segments: Segment[];
  closed: boolean;
  fill?: string | null;
  stroke?: string | null;
}

export interface PatternPart {
  part_id: string;
  name: string;
  paths: Path[];
}

export interface MasterGeometry {
  parts: PatternPart[];
  version: string;
  units: string;
}

// --- Story 3.2: Morph Delta Types ---

export interface MorphDeltaSegment {
  dx: number;
  dy: number;
  cp1_dx?: number | null;
  cp1_dy?: number | null;
  cp2_dx?: number | null;
  cp2_dy?: number | null;
}

export interface MorphDeltaPath {
  path_id: string;
  segments: MorphDeltaSegment[];
}

export interface MorphDeltaPart {
  part_id: string;
  paths: MorphDeltaPath[];
}

export interface MorphDelta {
  parts: MorphDeltaPart[];
  style_id: string;
}

// --- Story 3.4: Lock Design Types ---

export interface LockDesignResponse {
  success: boolean;
  design_id?: string;
  sequence_id?: string;
  geometry_hash?: string;
  error?: string;
}

// --- Story 4.1b: Guardrail Check Types ---

export interface ConstraintViolation {
  constraint_id: string;
  severity: "hard" | "soft";
  message_vi: string;
  violated_values: Record<string, number>;
  safe_suggestion: Record<string, number> | null;
}

export interface GuardrailCheckResult {
  status: "passed" | "warning" | "rejected";
  violations: ConstraintViolation[];
  warnings: ConstraintViolation[];
  last_valid_sequence_id: string | null;
}

// --- Story 4.2: Sanity Check Dashboard Types ---

/**
 * A single row in the Sanity Check Dashboard.
 * Represents one measurement dimension with Body/Base/Suggested comparison.
 */
export interface SanityCheckRow {
  /** Measurement key identifier (e.g., 'vong_nguc') */
  key: string;
  /** Vietnamese display label (e.g., 'Vòng ngực') */
  label_vi: string;
  /** Customer body measurement value (from DB), null if not available */
  body_value: number | null;
  /** Base pattern value for this measurement */
  base_value: number;
  /** AI-suggested value (Base + Delta) */
  suggested_value: number;
  /** Difference: suggested_value - base_value */
  delta: number;
  /** Unit of measurement (typically 'cm') */
  unit: string;
  /** Severity classification based on delta magnitude */
  severity: "normal" | "warning" | "danger";
}

/**
 * Response from the sanity-check API endpoint.
 * Story 4.2 AC#1-5: 3-column comparison data for Artisan Dashboard.
 */
export interface SanityCheckResponse {
  /** Sanity check comparison rows */
  rows: SanityCheckRow[];
  /** Current guardrail status (passed/warning/rejected) */
  guardrail_status: string | null;
  /** Whether the design is locked */
  is_locked: boolean;
  /** Geometry hash if design is locked */
  geometry_hash: string | null;
}
