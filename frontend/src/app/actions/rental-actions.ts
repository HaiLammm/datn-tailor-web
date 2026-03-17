"use server";

/**
 * Server actions for Rental Management operations.
 * Story 4.3: Rental Management Board (Owner-only).
 * All API calls are authenticated and forwarded with auth token.
 */

import { auth } from "@/auth";
import type {
  ProcessReturnInput,
  ProcessReturnResponse,
  RentalDetailResponse,
  RentalListParams,
  RentalListResponse,
  RentalStats,
} from "@/types/rental";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 10000;

/**
 * Fetch rental list with filtering and pagination (Owner-only).
 */
export async function fetchRentals(
  params: RentalListParams
): Promise<{ success: boolean; data?: RentalListResponse; error?: string }> {
  const session = await auth();
  if (!session?.accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    // Build query string from params
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append("status", params.status);
    if (params.search) queryParams.append("search", params.search);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.page_size) queryParams.append("page_size", params.page_size.toString());

    const url = `${BACKEND_URL}/api/v1/rentals?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`fetchRentals: HTTP ${response.status}`);
      return { success: false, error: `Lỗi máy chủ (HTTP ${response.status})` };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("fetchRentals error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Fetch rental statistics summary (Owner-only).
 */
export async function fetchRentalStats(): Promise<{
  success: boolean;
  data?: RentalStats;
  error?: string;
}> {
  const session = await auth();
  if (!session?.accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/rentals/stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`fetchRentalStats: HTTP ${response.status}`);
      return { success: false, error: `Lỗi máy chủ (HTTP ${response.status})` };
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("fetchRentalStats error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Fetch rental item detail for drawer (Owner-only).
 */
export async function fetchRentalDetail(
  order_item_id: string
): Promise<{ success: boolean; data?: RentalDetailResponse; error?: string }> {
  const session = await auth();
  if (!session?.accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/rentals/${order_item_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return { success: false, error: "Mục cho thuê không tồn tại" };
    }

    if (!response.ok) {
      console.error(`fetchRentalDetail: HTTP ${response.status}`);
      return { success: false, error: `Lỗi máy chủ (HTTP ${response.status})` };
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("fetchRentalDetail error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Process rental return with condition assessment (Owner-only).
 */
export async function processReturn(
  order_item_id: string,
  returnData: ProcessReturnInput
): Promise<{
  success: boolean;
  data?: ProcessReturnResponse;
  error?: string;
}> {
  const session = await auth();
  if (!session?.accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/rentals/${order_item_id}/return`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(returnData),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return { success: false, error: "Mục cho thuê không tồn tại" };
    }

    if (response.status === 422) {
      const errorData = await response.json();
      const msg =
        errorData?.error?.message || "Không thể xử lý trả hàng";
      console.error("processReturn: 422 Unprocessable", errorData);
      return { success: false, error: msg };
    }

    if (!response.ok) {
      console.error(`processReturn: HTTP ${response.status}`);
      return { success: false, error: `Lỗi máy chủ (HTTP ${response.status})` };
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("processReturn error:", msg);
    return { success: false, error: msg };
  }
}
