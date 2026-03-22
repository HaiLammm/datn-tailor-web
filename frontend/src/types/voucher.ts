/**
 * TypeScript types for customer voucher wallet (Story 4.4g).
 *
 * VoucherType: 'percent' (0-100%) or 'fixed' (VND flat discount)
 * VoucherStatus: computed by backend from is_used + expiry_date
 * value and min_order_value are Decimal → serialized as strings from API
 */

export type VoucherType = 'percent' | 'fixed';
export type VoucherStatus = 'active' | 'expired' | 'used';

export interface VoucherItem {
  /** user_vouchers.id — assignment record ID */
  id: string;
  /** vouchers.id — master voucher ID */
  voucher_id: string;
  code: string;
  type: VoucherType;
  /** Decimal serialized as string from backend — parse with parseFloat() */
  value: string;
  /** Decimal serialized as string from backend — parse with parseFloat() */
  min_order_value: string;
  /** Decimal or null — parse with parseFloat() if not null */
  max_discount_value: string | null;
  description: string | null;
  /** ISO date string "YYYY-MM-DD" */
  expiry_date: string;
  status: VoucherStatus;
  assigned_at: string;
}

export interface VouchersData {
  vouchers: VoucherItem[];
  voucher_count: number;
}

// --- Story 6.3: Owner voucher management types ---

export interface OwnerVoucher {
  id: string;
  code: string;
  type: VoucherType;
  /** Decimal serialized as string from backend — parse with parseFloat() */
  value: string;
  /** Decimal serialized as string from backend — parse with parseFloat() */
  min_order_value: string;
  /** Decimal or null — parse with parseFloat() if not null */
  max_discount_value: string | null;
  description: string | null;
  /** ISO date string "YYYY-MM-DD" */
  expiry_date: string;
  total_uses: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoucherFormData {
  code: string;
  type: VoucherType;
  value: number;
  min_order_value: number;
  max_discount_value: number | null;
  description: string;
  expiry_date: string;
  total_uses: number;
}

export interface VoucherStats {
  total_vouchers: number;
  active_vouchers: number;
  total_redemptions: number;
  redemption_rate: number;
}

export interface VoucherListApiResponse {
  data: OwnerVoucher[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export interface VoucherDetailApiResponse {
  data: OwnerVoucher;
}

export interface VoucherStatsApiResponse {
  data: VoucherStats;
}
