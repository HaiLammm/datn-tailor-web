/**
 * TypeScript types for Campaign and Message Template management (Story 6.4).
 *
 * Broadcasting & Template SMS/SNS — Owner creates bulk outreach campaigns
 * to customer segments via email (with SMS/Zalo stubs).
 */

export type ChannelType = "email" | "sms" | "zalo";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type RecipientStatus = "pending" | "sent" | "failed" | "opened" | "clicked";
export type SegmentType =
  | "all_customers"
  | "hot_leads"
  | "warm_leads"
  | "cold_leads"
  | "voucher_holders";

// --------- Message Templates ---------

export interface MessageTemplate {
  id: string;
  name: string;
  channel: ChannelType;
  subject: string | null;
  body: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateFormData {
  name: string;
  channel: ChannelType;
  subject: string;
  body: string;
}

export interface TemplatePreviewData {
  subject: string | null;
  body: string;
}

// --------- Campaigns ---------

export interface Campaign {
  id: string;
  name: string;
  channel: ChannelType;
  template_id: string;
  template_name: string;
  segment: SegmentType;
  voucher_id: string | null;
  voucher_code: string | null;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignFormData {
  name: string;
  channel: ChannelType;
  template_id: string;
  segment: SegmentType;
  voucher_id: string | null;
  scheduled_at: string | null;
}

// --------- Analytics ---------

export interface CampaignAnalytics {
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  open_rate: number;
  click_rate: number;
  voucher_redemptions: number;
}

export interface CampaignsSummary {
  total_campaigns: number;
  sent_campaigns: number;
  avg_open_rate: number;
  total_messages_this_month: number;
}

export interface SegmentInfo {
  segment: SegmentType;
  label: string;
  recipient_count: number;
}

// --------- Recipients ---------

export interface CampaignRecipient {
  id: string;
  email: string | null;
  recipient_name: string | null;
  status: RecipientStatus;
  sent_at: string | null;
  error_message: string | null;
}

// --------- API Response Wrappers ---------

export interface CampaignListApiResponse {
  data: Campaign[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export interface CampaignDetailApiResponse {
  data: Campaign;
}

export interface CampaignsSummaryApiResponse {
  data: CampaignsSummary;
}

export interface CampaignAnalyticsApiResponse {
  data: CampaignAnalytics;
}

export interface TemplateListApiResponse {
  data: MessageTemplate[];
  meta: { total: number };
}

export interface TemplateDetailApiResponse {
  data: MessageTemplate;
}

export interface TemplatePreviewApiResponse {
  data: TemplatePreviewData;
}

export interface SegmentListApiResponse {
  data: SegmentInfo[];
  meta: { total: number };
}

export interface RecipientListApiResponse {
  data: CampaignRecipient[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

// --------- UI Helpers ---------

export const SEGMENT_LABELS: Record<SegmentType, string> = {
  all_customers: "Tat ca khach hang",
  hot_leads: "Lead Hot",
  warm_leads: "Lead Warm",
  cold_leads: "Lead Cold",
  voucher_holders: "Nguoi so huu voucher",
};

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  email: "Email",
  sms: "SMS",
  zalo: "Zalo OA",
};

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Ban nhap",
  scheduled: "Da lich",
  sending: "Dang gui",
  sent: "Da gui",
  failed: "That bai",
};

export const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "text-stone-500 bg-stone-100",
  scheduled: "text-blue-700 bg-blue-100",
  sending: "text-amber-700 bg-amber-100",
  sent: "text-emerald-700 bg-emerald-100",
  failed: "text-red-700 bg-red-100",
};
