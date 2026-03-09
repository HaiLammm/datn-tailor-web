"use server";

import { auth } from "@/auth";
import { OverrideRequest, OverrideResponse, OverrideHistoryItem, OverrideHistoryResponse } from "@/types/override";

export class OverrideError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly violations?: Array<{ message: string; violated_values: Record<string, number> }>
  ) {
    super(message);
    this.name = "OverrideError";
  }
}

async function getAuthToken(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken ?? null;
}

/**
 * Story 4.3: Submit a manual override for a design.
 * 
 * @param designId - UUID of the design to override
 * @param request - Override details (key, value, reason, sequence_id)
 * @returns OverrideResponse on success, or throws OverrideError on failure
 */
export async function submitOverride(
  designId: string,
  request: OverrideRequest
): Promise<OverrideResponse> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

  const token = await getAuthToken();
  if (!token) {
    throw new OverrideError("Không có quyền truy cập", 401);
  }

  const response = await fetch(`${backendUrl}/api/v1/designs/${designId}/override`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json();
    
    if (response.status === 422) {
      const detail = errorData.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || "Vi phạm ràng buộc vật lý";
      const violations = detail?.violations || [];
      console.warn("Override rejected by guardrails:", message);
      throw new OverrideError(message, 422, violations);
    } else if (response.status === 403) {
      throw new OverrideError("Bạn không có quyền ghi đè thiết kế này", 403);
    } else if (response.status === 404) {
      throw new OverrideError("Không tìm thấy thiết kế", 404);
    } else {
      console.error(`Override submission failed: ${response.status}`);
      throw new OverrideError(`Lỗi server: ${response.status}`, response.status);
    }
  }

  return response.json();
}

/**
 * Story 4.3: Fetch override history for a design.
 * 
 * @param designId - UUID of the design
 */
export async function fetchOverrideHistory(
  designId: string
): Promise<OverrideHistoryItem[]> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

  try {
    const token = await getAuthToken();
    if (!token) {
      console.error("fetchOverrideHistory: no auth token");
      return [];
    }

    const response = await fetch(`${backendUrl}/api/v1/designs/${designId}/overrides`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch override history: ${response.status}`);
      return [];
    }

    const data: OverrideHistoryResponse = await response.json();
    return data.overrides;
  } catch (error) {
    console.error("Error fetching override history:", error);
    return [];
  }
}
