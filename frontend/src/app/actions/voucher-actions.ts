"use server";

/**
 * Server Actions for Owner Voucher CRUD (Story 6.3: Voucher Creator UI)
 *
 * All actions require Owner role — auth token forwarded to backend.
 * No direct browser-to-backend calls (proxy pattern).
 */

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  OwnerVoucher,
  VoucherDetailApiResponse,
  VoucherFormData,
  VoucherListApiResponse,
  VoucherStats,
  VoucherStatsApiResponse,
} from "@/types/voucher";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 10000;

async function getAuthToken(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken ?? null;
}

/**
 * Fetch vouchers list with optional filters (Owner only)
 */
export async function fetchVouchers(params?: {
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
}): Promise<VoucherListApiResponse | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const searchParams = new URLSearchParams();
    if (params?.is_active !== undefined) searchParams.append("is_active", params.is_active.toString());
    if (params?.search) searchParams.append("search", params.search);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.page_size) searchParams.append("page_size", params.page_size.toString());
    if (params?.sort_by) searchParams.append("sort_by", params.sort_by);
    if (params?.sort_order) searchParams.append("sort_order", params.sort_order);

    const qs = searchParams.toString();
    const url = `${BACKEND_URL}/api/v1/vouchers${qs ? `?${qs}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`fetchVouchers: HTTP ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      console.error("fetchVouchers error:", error.message);
    }
    return null;
  }
}

/**
 * Fetch voucher stats (Owner only)
 */
export async function fetchVoucherStats(): Promise<VoucherStats | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/vouchers/stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const result: VoucherStatsApiResponse = await response.json();
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Get single voucher by ID (Owner only)
 */
export async function getVoucherById(id: string): Promise<OwnerVoucher | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/vouchers/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    if (!response.ok) return null;

    const result: VoucherDetailApiResponse = await response.json();
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Create a new voucher (Owner only)
 */
export async function createVoucher(
  data: VoucherFormData
): Promise<{ success: boolean; voucher?: OwnerVoucher; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/vouchers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 409) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.detail || "Mã voucher đã tồn tại" };
    }

    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.detail || "Dữ liệu không hợp lệ" };
    }

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result: VoucherDetailApiResponse = await response.json();
    revalidatePath("/owner/vouchers");
    return { success: true, voucher: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Update a voucher (Owner only)
 */
export async function updateVoucher(
  id: string,
  data: Partial<VoucherFormData>
): Promise<{ success: boolean; voucher?: OwnerVoucher; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/vouchers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.detail || "Dữ liệu không hợp lệ" };
    }

    if (response.status === 404) return { success: false, error: "Không tìm thấy voucher" };

    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };

    const result: VoucherDetailApiResponse = await response.json();
    revalidatePath("/owner/vouchers");
    return { success: true, voucher: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Toggle voucher active/inactive (Owner only)
 */
export async function toggleVoucherActive(
  id: string
): Promise<{ success: boolean; voucher?: OwnerVoucher; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/vouchers/${id}/toggle-active`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) return { success: false, error: "Không tìm thấy voucher" };
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };

    const result: VoucherDetailApiResponse = await response.json();
    revalidatePath("/owner/vouchers");
    return { success: true, voucher: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Delete a voucher (Owner only) — only if used_count == 0
 */
export async function deleteVoucher(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/vouchers/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.detail || "Không thể xóa voucher đã sử dụng" };
    }

    if (response.status === 404) return { success: false, error: "Không tìm thấy voucher" };
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };

    revalidatePath("/owner/vouchers");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}
