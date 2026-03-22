"use server";

/**
 * Server Actions for Lead CRM operations (Story 6.1: Leads Board)
 *
 * All actions require Owner role - auth token is forwarded to backend.
 * No direct browser-to-backend calls (proxy pattern).
 */

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  CreateLeadData,
  Lead,
  LeadConvertApiResponse,
  LeadConvertResponse,
  LeadDetailApiResponse,
  LeadFilter,
  LeadListApiResponse,
  UpdateLeadData,
} from "@/types/lead";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 10000; // 10 seconds

async function getAuthToken(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken ?? null;
}

/**
 * Fetch leads list with optional filters (Owner only)
 */
export async function fetchLeads(
  filters?: LeadFilter
): Promise<LeadListApiResponse | null> {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.error("fetchLeads: No auth token");
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const params = new URLSearchParams();
    if (filters?.classification) params.append("classification", filters.classification);
    if (filters?.source) params.append("source", filters.source);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.page_size) params.append("page_size", filters.page_size.toString());
    if (filters?.sort_by) params.append("sort_by", filters.sort_by);
    if (filters?.sort_order) params.append("sort_order", filters.sort_order);

    const url = `${BACKEND_URL}/api/v1/leads${params.toString() ? `?${params.toString()}` : ""}`;

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
      console.error(`fetchLeads: HTTP ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("fetchLeads: Request timeout");
      } else {
        console.error("fetchLeads error:", error.message);
      }
    }
    return null;
  }
}

/**
 * Fetch single lead detail (Owner only)
 */
export async function getLeadById(id: string): Promise<Lead | null> {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.error("getLeadById: No auth token");
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/leads/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (response.status === 404) return null;

    if (!response.ok) {
      console.error(`getLeadById: HTTP ${response.status}`);
      return null;
    }

    const result: LeadDetailApiResponse = await response.json();
    return result.data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("getLeadById: Request timeout");
      } else {
        console.error("getLeadById error:", error.message);
      }
    }
    return null;
  }
}

/**
 * Create a new lead (Owner only)
 */
export async function createLead(
  data: CreateLeadData
): Promise<{ success: boolean; lead?: Lead; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) return { success: false, error: "Unauthorized" };
    if (response.status === 403) return { success: false, error: "Forbidden" };

    if (response.status === 422) {
      const errorData = await response.json();
      console.error("createLead: 422 Validation error", errorData);
      return { success: false, error: "Dữ liệu không hợp lệ" };
    }

    if (!response.ok) {
      console.error(`createLead: HTTP ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result: LeadDetailApiResponse = await response.json();
    revalidatePath("/owner/crm");
    return { success: true, lead: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Update a lead (Owner only)
 */
export async function updateLead(
  id: string,
  data: UpdateLeadData
): Promise<{ success: boolean; lead?: Lead; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/leads/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) return { success: false, error: "Unauthorized" };
    if (response.status === 403) return { success: false, error: "Forbidden" };
    if (response.status === 404) return { success: false, error: "Không tìm thấy lead" };

    if (response.status === 422) {
      const errorData = await response.json();
      console.error("updateLead: 422 Validation error", errorData);
      return { success: false, error: "Dữ liệu không hợp lệ" };
    }

    if (!response.ok) {
      console.error(`updateLead: HTTP ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result: LeadDetailApiResponse = await response.json();
    revalidatePath("/owner/crm");
    return { success: true, lead: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Delete a lead (Owner only)
 */
export async function deleteLead(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/leads/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) return { success: false, error: "Unauthorized" };
    if (response.status === 403) return { success: false, error: "Forbidden" };
    if (response.status === 404) return { success: false, error: "Không tìm thấy lead" };

    if (!response.ok) {
      console.error(`deleteLead: HTTP ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    revalidatePath("/owner/crm");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Update lead classification only - used for optimistic UI (Owner only)
 */
export async function updateLeadClassification(
  id: string,
  classification: "hot" | "warm" | "cold"
): Promise<{ success: boolean; lead?: Lead; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(
      `${BACKEND_URL}/api/v1/leads/${id}/classification`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ classification }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 401) return { success: false, error: "Unauthorized" };
    if (response.status === 403) return { success: false, error: "Forbidden" };
    if (response.status === 404) return { success: false, error: "Không tìm thấy lead" };

    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      return { success: false, error: json.detail || `HTTP ${response.status}` };
    }

    const result: LeadDetailApiResponse = await response.json();
    revalidatePath("/owner/crm");
    return { success: true, lead: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Convert a lead to a customer profile (Owner only) - Story 6.2
 *
 * Creates customer profile, default measurement, audit log, and deletes the lead.
 */
export async function convertLeadToCustomer(
  leadId: string,
  createAccount: boolean = false
): Promise<{ success: boolean; data?: LeadConvertResponse; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(
      `${BACKEND_URL}/api/v1/leads/${leadId}/convert`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ create_account: createAccount }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 401) return { success: false, error: "Unauthorized" };
    if (response.status === 403) return { success: false, error: "Chỉ Owner mới có quyền chuyển Lead" };

    if (response.status === 404) {
      return { success: false, error: "Lead không tồn tại hoặc đã được chuyển thành khách hàng" };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.detail || `HTTP ${response.status}` };
    }

    const result: LeadConvertApiResponse = await response.json();
    revalidatePath("/owner/crm");
    revalidatePath("/owner/customers");
    return { success: true, data: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}
