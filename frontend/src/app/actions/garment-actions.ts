"use server";

/**
 * Server actions for Garment operations (Story 5.1: Digital Showroom)
 * 
 * Public browsing actions do NOT need auth token.
 * Admin actions (create/update/delete) require Owner role.
 */

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  Garment,
  GarmentFilter,
  GarmentApiResponse,
  GarmentDetailApiResponse
} from "@/types/garment";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 10000; // 10 seconds

async function getAuthToken(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken ?? null;
}

/**
 * Fetch garments list with optional filters (Public - no auth required)
 */
export async function fetchGarments(
  filters?: GarmentFilter
): Promise<GarmentApiResponse | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const params = new URLSearchParams();
    if (filters?.color) params.append("color", filters.color);
    if (filters?.occasion) params.append("occasion", filters.occasion);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.page_size) params.append("page_size", filters.page_size.toString());

    const url = `${BACKEND_URL}/api/v1/garments${params.toString() ? `?${params.toString()}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store", // ISR: revalidate on each request for fresh data
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`fetchGarments: HTTP ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("fetchGarments: Request timeout");
      } else {
        console.error("fetchGarments error:", error.message);
      }
    }
    return null;
  }
}

/**
 * Fetch single garment detail (Public - no auth required)
 */
export async function fetchGarmentDetail(
  id: string
): Promise<Garment | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/garments/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      next: { revalidate: 60 }, // ISR: revalidate every 60s for detail page
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      console.error("fetchGarmentDetail: Garment not found");
      return null;
    }

    if (!response.ok) {
      console.error(`fetchGarmentDetail: HTTP ${response.status}`);
      return null;
    }

    const result: GarmentDetailApiResponse = await response.json();
    return result.data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("fetchGarmentDetail: Request timeout");
      } else {
        console.error("fetchGarmentDetail error:", error.message);
      }
    }
    return null;
  }
}

/**
 * Create a new garment (Owner only - requires auth)
 */
export async function createGarment(
  data: {
    name: string;
    description?: string | null;
    category: string;
    color?: string | null;
    occasion?: string | null;
    size_options: string[];
    rental_price: string;
    image_url?: string | null;
  }
): Promise<{ success: boolean; garment?: Garment; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.error("createGarment: No auth token - user not authenticated");
      return { success: false, error: "Unauthorized" };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/garments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      console.error("createGarment: 401 Unauthorized");
      return { success: false, error: "Unauthorized" };
    }

    if (response.status === 403) {
      console.error("createGarment: 403 Forbidden - insufficient permissions");
      return { success: false, error: "Forbidden" };
    }

    if (response.status === 422) {
      const errorData = await response.json();
      console.error("createGarment: 422 Validation error", errorData);
      return { success: false, error: "Validation error" };
    }

    if (!response.ok) {
      console.error(`createGarment: HTTP ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result: GarmentDetailApiResponse = await response.json();
    return { success: true, garment: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("createGarment: Request timeout");
        return { success: false, error: "Timeout" };
      } else {
        console.error("createGarment error:", error.message);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Update a garment (Owner only - requires auth)
 */
export async function updateGarment(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    category: string;
    color: string | null;
    occasion: string | null;
    size_options: string[];
    rental_price: string;
    image_url: string | null;
    status: string;
    expected_return_date: string | null;
  }>
): Promise<{ success: boolean; garment?: Garment; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.error("updateGarment: No auth token - user not authenticated");
      return { success: false, error: "Unauthorized" };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/garments/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      console.error("updateGarment: 401 Unauthorized");
      return { success: false, error: "Unauthorized" };
    }

    if (response.status === 403) {
      console.error("updateGarment: 403 Forbidden - insufficient permissions");
      return { success: false, error: "Forbidden" };
    }

    if (response.status === 404) {
      console.error("updateGarment: 404 Not found");
      return { success: false, error: "Not found" };
    }

    if (response.status === 422) {
      const errorData = await response.json();
      console.error("updateGarment: 422 Validation error", errorData);
      return { success: false, error: "Validation error" };
    }

    if (!response.ok) {
      console.error(`updateGarment: HTTP ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result: GarmentDetailApiResponse = await response.json();
    return { success: true, garment: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("updateGarment: Request timeout");
        return { success: false, error: "Timeout" };
      } else {
        console.error("updateGarment error:", error.message);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Delete a garment (Owner only - requires auth)
 */
export async function deleteGarment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.error("deleteGarment: No auth token - user not authenticated");
      return { success: false, error: "Unauthorized" };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/garments/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      console.error("deleteGarment: 401 Unauthorized");
      return { success: false, error: "Unauthorized" };
    }

    if (response.status === 403) {
      console.error("deleteGarment: 403 Forbidden - insufficient permissions");
      return { success: false, error: "Forbidden" };
    }

    if (response.status === 404) {
      console.error("deleteGarment: 404 Not found");
      return { success: false, error: "Not found" };
    }

    if (!response.ok) {
      console.error(`deleteGarment: HTTP ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("deleteGarment: Request timeout");
        return { success: false, error: "Timeout" };
      } else {
        console.error("deleteGarment error:", error.message);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Update garment status (Owner only) - Story 5.3 '2-Touch' Update.
 */
export async function updateGarmentStatus(
  id: string,
  status: string,
  expectedReturnDate?: string
): Promise<{ success: boolean; data?: Garment; error?: string }> {
  const session = await auth();
  const token = session?.accessToken;

  if (!token) {
    return { success: false, error: "Unauthorized" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const body: Record<string, unknown> = { status };
    if (expectedReturnDate) {
      body.expected_return_date = expectedReturnDate;
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/garments/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.detail || `HTTP ${response.status}` };
    }

    revalidatePath("/(workplace)/owner/inventory");
    revalidatePath("/(customer)/showroom");
    revalidatePath(`/(customer)/showroom/${id}`);

    return { success: true, data: json.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { success: false, error: "Timeout" };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch inventory list sorted by status (Owner/Staff only).
 */
export async function fetchInventoryList(
  sortByStatus: boolean = true
): Promise<{ data: Garment[]; total: number; error?: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { data: [], total: 0, error: "Unauthorized" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const params = new URLSearchParams({
      sort_by_status: sortByStatus.toString(),
      page: "1",
      page_size: "100", // Large enough for inventory view
    });

    const response = await fetch(`${BACKEND_URL}/api/v1/garments?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      next: { revalidate: 60 },
    });

    clearTimeout(timeoutId);

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.detail || "Failed to fetch inventory");
    }

    return {
      data: json.data.items,
      total: json.data.total,
    };
  } catch (error) {
    console.error("fetchInventoryList error:", error);
    return { data: [], total: 0, error: error instanceof Error ? error.message : "Unknown error" };
  } finally {
    clearTimeout(timeoutId);
  }
}
