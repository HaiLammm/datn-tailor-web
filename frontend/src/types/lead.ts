/**
 * TypeScript types for Lead CRM module (Story 6.1)
 * Fields use snake_case for SSOT synchronization with backend Pydantic schemas.
 */

export type LeadSource =
  | "manual"
  | "website"
  | "booking_abandoned"
  | "cart_abandoned"
  | "signup";

export type LeadClassification = "hot" | "warm" | "cold";

export interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  classification: LeadClassification;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadFilter {
  classification?: LeadClassification | null;
  source?: LeadSource | null;
  search?: string | null;
  page?: number;
  page_size?: number;
  sort_by?: "created_at" | "name" | "classification" | "source";
  sort_order?: "asc" | "desc";
}

export interface LeadListData {
  items: Lead[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LeadListApiResponse {
  data: LeadListData;
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export interface LeadDetailApiResponse {
  data: Lead;
}

export interface CreateLeadData {
  name: string;
  phone?: string | null;
  email?: string | null;
  source: LeadSource;
  classification: LeadClassification;
  notes?: string | null;
}

export interface UpdateLeadData {
  name?: string;
  phone?: string | null;
  email?: string | null;
  source?: LeadSource;
  classification?: LeadClassification;
  notes?: string | null;
}

/** Display labels for lead sources (Vietnamese) */
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  manual: "Nhập tay",
  website: "Website",
  booking_abandoned: "Đặt lịch bỏ dở",
  cart_abandoned: "Giỏ hàng bỏ dở",
  signup: "Đăng ký tài khoản",
};

/** Display labels for lead classifications (Vietnamese) */
export const LEAD_CLASSIFICATION_LABELS: Record<LeadClassification, string> = {
  hot: "Hot 🟢",
  warm: "Warm 🟡",
  cold: "Cold 🔴",
};

// --- Story 6.2: Lead-to-Customer Conversion ---

export interface LeadConvertRequest {
  create_account: boolean;
}

export interface LeadConvertResponse {
  customer_profile_id: string;
  customer_name: string;
  message: string;
}

export interface LeadConvertApiResponse {
  data: LeadConvertResponse;
}

/** Tailwind color classes for classification badges */
export const LEAD_CLASSIFICATION_COLORS: Record<
  LeadClassification,
  { bg: string; text: string; border: string }
> = {
  hot: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-200",
  },
  warm: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
  },
  cold: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
  },
};
