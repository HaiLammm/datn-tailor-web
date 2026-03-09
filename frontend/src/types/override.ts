import { GuardrailCheckResult } from "./geometry";

/**
 * Story 4.3: Manual Override Types
 */

export interface OverrideRequest {
  /** Measurement key to override (e.g., 'vong_eo') */
  delta_key: string;
  /** New value chosen by the tailor (cm) */
  overridden_value: number;
  /** Vietnamese reason for override (optional) */
  reason_vi?: string;
  /** Current sequence ID of the design */
  sequence_id: number;
}

export interface OverrideResponse {
  /** Override record UUID */
  id: string;
  /** Overridden measurement key */
  delta_key: string;
  /** Vietnamese display label */
  label_vi: string;
  /** AI-suggested value (before override) */
  original_value: number;
  /** New manual value */
  overridden_value: number;
  /** Vietnamese reason for override */
  reason_vi: string | null;
  /** Whether this is flagged for AI training */
  flagged_for_learning: boolean;
  /** Guardrail results for this override */
  guardrail_result: GuardrailCheckResult;
  /** Timestamp of the override */
  created_at: string;
}

export interface OverrideHistoryItem {
  /** Override record UUID */
  id: string;
  /** Overridden measurement key */
  delta_key: string;
  /** Vietnamese display label */
  label_vi: string;
  /** AI-suggested value */
  original_value: number;
  /** New manual value */
  overridden_value: number;
  /** Vietnamese reason */
  reason_vi: string | null;
  /** Name of the tailor who performed the override */
  tailor_name: string;
  /** Timestamp of the override */
  created_at: string;
}

export interface OverrideHistoryResponse {
  /** List of overrides */
  overrides: OverrideHistoryItem[];
  /** Total number of overrides for this design */
  total: number;
}
