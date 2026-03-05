"use server";

/**
 * Design Session Server Actions - Story 2.2, 2.3 & 2.4
 *
 * Server Actions for mutating design session data.
 * Handles intensity submission, fabric recommendations, and emotional translation.
 */

import {
  fabricRecommendationResponseSchema,
  type FabricRecommendationResponse,
} from "@/types/fabric";
import {
  translateResponseSchema,
  type TranslateResponse,
  type IntensityValueItem as InferenceIntensityValueItem,
} from "@/types/inference";
import {
  intensitySubmitResponseSchema,
  type IntensitySubmitResponse,
  type IntensityValueItem,
} from "@/types/style";

const BACKEND_URL = (() => {
  const url = process.env.BACKEND_URL;
  if (!url && process.env.NODE_ENV === "production") {
    console.warn("[design-actions] BACKEND_URL env var is not set — falling back to http://localhost:8000");
  }
  return url ?? "http://localhost:8000";
})();

/**
 * Submit intensity slider values to backend for validation (Story 2.2).
 *
 * Sends the current intensity state to the FastAPI backend, which:
 * 1. Validates all values are within slider bounds
 * 2. Checks soft constraints and returns warnings
 *
 * @param pillarId - The selected style pillar ID
 * @param intensities - List of slider key-value pairs
 * @param sequenceId - Monotonically increasing counter for concurrency control
 * @returns IntensitySubmitResponse with success flag and any warnings
 */
export async function submitIntensity(
  pillarId: string,
  intensities: IntensityValueItem[],
  sequenceId: number
): Promise<IntensitySubmitResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/styles/submit-intensity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pillar_id: pillarId,
        intensities,
        sequence_id: sequenceId,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // AC5: Specific message for stale sequence (409 Conflict)
      if (response.status === 409) {
        return {
          success: false,
          sequence_id: sequenceId,
          warnings: [],
          error: "Yêu cầu đã cũ — dữ liệu mới hơn đã được gửi",
        };
      }
      // Return a failure response — UI will handle gracefully
      return {
        success: false,
        sequence_id: sequenceId,
        warnings: [],
        error: `Lỗi kết nối: ${response.status}`,
      };
    }

    const raw: unknown = await response.json();

    // Validate response shape with Zod before returning
    const parsed = intensitySubmitResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        sequence_id: sequenceId,
        warnings: [],
        error: "Phản hồi từ Backend không đúng định dạng",
      };
    }

    return parsed.data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, sequence_id: sequenceId, warnings: [], error: "Yêu cầu quá thời hạn — thử lại sau" };
    }
    return { success: false, sequence_id: sequenceId, warnings: [], error: "Lỗi kết nối với máy chủ" };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch fabric recommendations from backend (Story 2.3).
 *
 * Calls GET /api/v1/fabrics/recommendations with pillar and intensity values.
 *
 * @param pillarId - The selected style pillar ID
 * @param intensities - Current slider key-value map
 * @returns FabricRecommendationResponse or error object
 */
export async function fetchFabricRecommendations(
  pillarId: string,
  intensities: Record<string, number>
): Promise<FabricRecommendationResponse | { error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const params = new URLSearchParams({
      pillar_id: pillarId,
      intensities: JSON.stringify(intensities),
    });

    const response = await fetch(
      `${BACKEND_URL}/api/v1/fabrics/recommendations?${params.toString()}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      return { error: `Lỗi kết nối: ${response.status}` };
    }

    const raw: unknown = await response.json();
    const parsed = fabricRecommendationResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: "Phản hồi từ Backend không đúng định dạng" };
    }

    return parsed.data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Yêu cầu quá thời hạn — thử lại sau" };
    }
    return { error: "Lỗi kết nối với máy chủ" };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Translate style intensities to Master Geometry Snapshot (Story 2.4).
 *
 * Calls POST /api/v1/inference/translate to invoke the Emotional Compiler Engine.
 * The LangGraph agent translates slider intensities into geometric Deltas.
 *
 * @param pillarId - The selected style pillar ID (e.g., 'traditional', 'minimalist')
 * @param intensities - List of slider key-value pairs
 * @param sequenceId - Monotonically increasing counter for concurrency control
 * @param baseMeasurementId - Optional base measurement profile ID (for future use)
 * @returns TranslateResponse with Master Geometry Snapshot or error
 */
export async function translateDesign(
  pillarId: string,
  intensities: InferenceIntensityValueItem[],
  sequenceId: number,
  baseMeasurementId?: string | null
): Promise<TranslateResponse> {
  const controller = new AbortController();
  // NFR1: 15 seconds max, but we use 14s to allow some buffer
  const timeoutId = setTimeout(() => controller.abort(), 14_000);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/inference/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pillar_id: pillarId,
        intensities,
        sequence_id: sequenceId,
        base_measurement_id: baseMeasurementId ?? null,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Handle specific HTTP errors with Vietnamese messages (NFR11)
      if (response.status === 400) {
        return {
          success: false,
          snapshot: null,
          inference_time_ms: 0,
          error: "Dữ liệu không hợp lệ — vui lòng kiểm tra lại",
        };
      }
      if (response.status === 404) {
        return {
          success: false,
          snapshot: null,
          inference_time_ms: 0,
          error: "Không tìm thấy quy tắc cho phong cách này",
        };
      }
      if (response.status === 500) {
        return {
          success: false,
          snapshot: null,
          inference_time_ms: 0,
          error: "Lỗi máy chủ — vui lòng thử lại sau",
        };
      }
      return {
        success: false,
        snapshot: null,
        inference_time_ms: 0,
        error: `Lỗi kết nối: ${response.status}`,
      };
    }

    const raw: unknown = await response.json();

    // Validate response shape with Zod before returning
    const parsed = translateResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        snapshot: null,
        inference_time_ms: 0,
        error: "Phản hồi từ Backend không đúng định dạng",
      };
    }

    return parsed.data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        snapshot: null,
        inference_time_ms: 0,
        error: "Yêu cầu quá thời hạn (>15 giây) — thử lại sau",
      };
    }
    return {
      success: false,
      snapshot: null,
      inference_time_ms: 0,
      error: "Lỗi kết nối với máy chủ",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
