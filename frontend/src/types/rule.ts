/**
 * Rule Types - TypeScript types and Zod schemas
 * Story 2.5: Phác thảo Giao diện Rule Editor
 *
 * Uses snake_case for API field names to match Backend SSOT.
 */

import { z } from "zod";

// ===== Delta Mapping Detail =====

/** Detail view of a single delta mapping within a rule (AC2). */
export interface DeltaMappingDetail {
  slider_key: string;
  delta_key: string;
  delta_label_vi: string;
  delta_unit: string;
  slider_range_min: number;
  slider_range_max: number;
  scale_factor: number;
  offset: number;
  golden_point: number;
}

export const deltaMappingDetailSchema = z.object({
  slider_key: z.string(),
  delta_key: z.string(),
  delta_label_vi: z.string(),
  delta_unit: z.string(),
  slider_range_min: z.number(),
  slider_range_max: z.number(),
  scale_factor: z.number(),
  offset: z.number(),
  golden_point: z.number().min(0).max(100).default(50),
});

// ===== Rule Pillar Summary =====

/** Summary view for pillar list (AC1). */
export interface RulePillarSummary {
  pillar_id: string;
  pillar_name_vi: string;
  delta_mapping_count: number;
  slider_count: number;
  last_modified: string;
}

export const rulePillarSummarySchema = z.object({
  pillar_id: z.string(),
  pillar_name_vi: z.string(),
  delta_mapping_count: z.number().int().nonnegative(),
  slider_count: z.number().int().nonnegative(),
  last_modified: z.string(),
});

// ===== Rule Pillar Detail =====

/** Full detail view of a pillar's rules (AC2). */
export interface RulePillarDetail {
  pillar_id: string;
  pillar_name_vi: string;
  mappings: DeltaMappingDetail[];
  last_modified: string;
}

export const rulePillarDetailSchema = z.object({
  pillar_id: z.string(),
  pillar_name_vi: z.string(),
  mappings: z.array(deltaMappingDetailSchema),
  last_modified: z.string(),
});

// ===== Rule Update Request =====

/** Single delta mapping update item (AC3). */
export interface DeltaMappingUpdateItem {
  slider_key: string;
  delta_key: string;
  delta_label_vi: string;
  delta_unit: string;
  slider_range_min: number;
  slider_range_max: number;
  scale_factor: number;
  offset: number;
  golden_point: number;
}

export const deltaMappingUpdateItemSchema = z.object({
  slider_key: z.string().min(1),
  delta_key: z.string().min(1),
  delta_label_vi: z.string().min(1),
  delta_unit: z.string(),
  slider_range_min: z.number(),
  slider_range_max: z.number(),
  scale_factor: z.number()
    .refine((v) => v !== 0, { message: "Hệ số tỷ lệ không được bằng 0" })
    .refine((v) => Math.abs(v) <= 1.0, { message: "Hệ số tỷ lệ phải nằm trong khoảng -1.0 đến 1.0" }),
  offset: z.number(),
  golden_point: z.number().min(0, { message: "Điểm Vàng phải >= 0" }).max(100, { message: "Điểm Vàng phải <= 100" }).default(50),
}).refine((data) => data.slider_range_max > data.slider_range_min, {
  message: "Giá trị tối đa phải lớn hơn giá trị tối thiểu",
  path: ["slider_range_max"],
});

export interface RuleUpdateRequest {
  mappings: DeltaMappingUpdateItem[];
}

// ===== Rule Update Response =====

/** Response after updating rules (AC3). */
export interface RuleUpdateResponse {
  success: boolean;
  pillar_id: string;
  pillar_name_vi: string;
  mapping_count: number;
  last_modified: string;
  message: string;
}

export const ruleUpdateResponseSchema = z.object({
  success: z.boolean(),
  pillar_id: z.string(),
  pillar_name_vi: z.string(),
  mapping_count: z.number().int().nonnegative(),
  last_modified: z.string(),
  message: z.string(),
});
