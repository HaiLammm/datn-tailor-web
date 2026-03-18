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
