"use server";

/**
 * Server Actions for Owner Campaign & Template management (Story 6.4).
 *
 * All actions require Owner role — auth token forwarded to backend.
 * No direct browser-to-backend calls (proxy pattern).
 */

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type {
  Campaign,
  CampaignAnalytics,
  CampaignAnalyticsApiResponse,
  CampaignDetailApiResponse,
  CampaignFormData,
  CampaignListApiResponse,
  CampaignRecipient,
  CampaignsSummary,
  CampaignsSummaryApiResponse,
  MessageTemplate,
  RecipientListApiResponse,
  SegmentInfo,
  SegmentListApiResponse,
  TemplateDetailApiResponse,
  TemplateFormData,
  TemplateListApiResponse,
  TemplatePreviewApiResponse,
  TemplatePreviewData,
} from "@/types/campaign";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 15000; // Campaign sends can take longer

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean {
  return UUID_RE.test(id);
}

async function getAuthToken(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken ?? null;
}

// ============================================================
// Campaign Actions
// ============================================================

/**
 * Fetch campaigns list with optional status filter
 */
export async function fetchCampaigns(params?: {
  status_filter?: string;
  page?: number;
  page_size?: number;
}): Promise<CampaignListApiResponse | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const searchParams = new URLSearchParams();
    if (params?.status_filter) searchParams.append("status_filter", params.status_filter);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.page_size) searchParams.append("page_size", params.page_size.toString());

    const qs = searchParams.toString();
    const url = `${BACKEND_URL}/api/v1/campaigns${qs ? `?${qs}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Fetch campaigns summary stats
 */
export async function fetchCampaignsSummary(): Promise<CampaignsSummary | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/campaigns/summary`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const result: CampaignsSummaryApiResponse = await response.json();
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Fetch segment options with recipient counts
 */
export async function fetchSegments(): Promise<SegmentInfo[] | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/campaigns/segments`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const result: SegmentListApiResponse = await response.json();
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Get single campaign by ID
 */
export async function getCampaignById(id: string): Promise<Campaign | null> {
  if (!isValidUUID(id)) return null;
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/campaigns/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const result: CampaignDetailApiResponse = await response.json();
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Create a new campaign
 */
export async function createCampaign(
  data: CampaignFormData
): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 409) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "Ten chien dich da ton tai" };
    }
    if (response.status === 400) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "Du lieu khong hop le" };
    }
    if (response.status === 404) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "Template hoac voucher khong tim thay" };
    }
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };

    const result: CampaignDetailApiResponse = await response.json();
    revalidatePath("/owner/campaigns");
    return { success: true, campaign: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Update a draft campaign
 */
export async function updateCampaign(
  id: string,
  data: Partial<CampaignFormData>
): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
  if (!isValidUUID(id)) return { success: false, error: "Invalid ID" };
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 404) return { success: false, error: "Khong tim thay chien dich" };
    if (response.status === 400) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "Du lieu khong hop le" };
    }
    if (response.status === 409) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "Ten chien dich da ton tai" };
    }
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };

    const result: CampaignDetailApiResponse = await response.json();
    revalidatePath("/owner/campaigns");
    return { success: true, campaign: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Delete a draft/failed campaign
 */
export async function deleteCampaign(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidUUID(id)) return { success: false, error: "Invalid ID" };
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/campaigns/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 404) return { success: false, error: "Khong tim thay chien dich" };
    if (response.status === 400) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "Khong the xoa chien dich nay" };
    }
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };

    revalidatePath("/owner/campaigns");
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
 * Send a campaign to its segment recipients
 */
export async function sendCampaign(
  id: string
): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
  if (!isValidUUID(id)) return { success: false, error: "Invalid ID" };
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for large sends

    const response = await fetch(`${BACKEND_URL}/api/v1/campaigns/${id}/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 400) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "Khong the gui chien dich nay" };
    }
    if (response.status === 404) return { success: false, error: "Khong tim thay chien dich" };
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };

    const result: CampaignDetailApiResponse = await response.json();
    revalidatePath("/owner/campaigns");
    return { success: true, campaign: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout - Chien dich co the van dang gui" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Fetch campaign analytics
 */
export async function fetchCampaignAnalytics(id: string): Promise<CampaignAnalytics | null> {
  if (!isValidUUID(id)) return null;
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/campaigns/${id}/analytics`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const result: CampaignAnalyticsApiResponse = await response.json();
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Fetch campaign recipients log
 */
export async function fetchCampaignRecipients(
  id: string,
  page: number = 1
): Promise<{ data: CampaignRecipient[]; total: number } | null> {
  if (!isValidUUID(id)) return null;
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(
      `${BACKEND_URL}/api/v1/campaigns/${id}/recipients?page=${page}&page_size=50`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        signal: controller.signal,
        cache: "no-store",
      }
    );
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const result: RecipientListApiResponse = await response.json();
    return { data: result.data, total: result.meta.total };
  } catch {
    return null;
  }
}

// ============================================================
// Template Actions
// ============================================================

/**
 * Fetch message templates list
 */
export async function fetchTemplates(channel?: string): Promise<MessageTemplate[] | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const params = new URLSearchParams();
    if (channel) params.append("channel", channel);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`${BACKEND_URL}/api/v1/templates${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const result: TemplateListApiResponse = await response.json();
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Get single template by ID
 */
export async function getTemplateById(id: string): Promise<MessageTemplate | null> {
  if (!isValidUUID(id)) return null;
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/templates/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const result: TemplateDetailApiResponse = await response.json();
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Create a new message template
 */
export async function createTemplate(
  data: TemplateFormData
): Promise<{ success: boolean; template?: MessageTemplate; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 409) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "Ten template da ton tai" };
    }
    if (response.status === 400) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "Du lieu khong hop le" };
    }
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };

    const result: TemplateDetailApiResponse = await response.json();
    revalidatePath("/owner/campaigns/templates");
    return { success: true, template: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Update a message template
 */
export async function updateTemplate(
  id: string,
  data: Partial<TemplateFormData>
): Promise<{ success: boolean; template?: MessageTemplate; error?: string }> {
  if (!isValidUUID(id)) return { success: false, error: "Invalid ID" };
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 404) return { success: false, error: "Khong tim thay template" };
    if (response.status === 409) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "Ten template da ton tai" };
    }
    if (response.status === 400) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "Du lieu khong hop le" };
    }
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };

    const result: TemplateDetailApiResponse = await response.json();
    revalidatePath("/owner/campaigns/templates");
    return { success: true, template: result.data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") return { success: false, error: "Timeout" };
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

/**
 * Delete a message template
 */
export async function deleteTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidUUID(id)) return { success: false, error: "Invalid ID" };
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: "Unauthorized" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/templates/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 404) return { success: false, error: "Khong tim thay template" };
    if (response.status === 400) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "Khong the xoa template dang su dung" };
    }
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };

    revalidatePath("/owner/campaigns/templates");
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
 * Preview a template with sample data
 */
export async function previewTemplate(
  id: string,
  sampleData?: {
    sample_name?: string;
    sample_voucher_code?: string;
    sample_voucher_value?: string;
    sample_expiry_date?: string;
    sample_shop_name?: string;
  }
): Promise<TemplatePreviewData | null> {
  if (!isValidUUID(id)) return null;
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/v1/templates/${id}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(sampleData ?? {}),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const result: TemplatePreviewApiResponse = await response.json();
    return result.data;
  } catch {
    return null;
  }
}
