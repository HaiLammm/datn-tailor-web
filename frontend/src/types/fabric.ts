/**
 * Fabric Recommendation Types - Story 2.3
 *
 * TypeScript types and Zod schemas for fabric recommendation API.
 * Uses snake_case for API field names to match Backend SSOT.
 */

import { z } from "zod";

// ===== Fabric Property Schema =====

export const fabricPropertySchema = z.object({
  do_ru: z.string(),
  do_day: z.string(),
  do_co_dan: z.string(),
  do_bong: z.string(),
  kha_nang_giu_phom: z.string(),
});

export type FabricProperty = z.infer<typeof fabricPropertySchema>;

// ===== Fabric Response Schema =====

export const fabricResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  image_url: z.string().nullable(),
  properties: fabricPropertySchema,
  compatibility_score: z.number().min(0).max(100),
  compatibility_label: z.string(),
});

export type FabricResponse = z.infer<typeof fabricResponseSchema>;

// ===== Fabric Recommendation Response Schema =====

export const fabricRecommendationResponseSchema = z.object({
  pillar_id: z.string(),
  fabrics: z.array(fabricResponseSchema),
  total: z.number(),
});

export type FabricRecommendationResponse = z.infer<typeof fabricRecommendationResponseSchema>;

// ===== Vietnamese property labels (for UI display) =====

export const FABRIC_PROPERTY_LABELS: Record<keyof FabricProperty, string> = {
  do_ru: "Độ rủ",
  do_day: "Độ dày",
  do_co_dan: "Độ co dãn",
  do_bong: "Độ bóng",
  kha_nang_giu_phom: "Giữ phom",
};

export const FABRIC_LEVEL_LABELS: Record<string, string> = {
  none: "Không",
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  light: "Mỏng",
  heavy: "Dày",
};
