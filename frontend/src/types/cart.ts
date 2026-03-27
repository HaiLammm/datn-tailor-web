/**
 * Cart types - Story 3.1: Cart State Management
 * CartItem, CartState, CartStore types for Zustand cart store.
 */

export type CartTransactionType = "buy" | "rent" | "bespoke";

export interface CartItem {
  id: string;               // UUID v4 (generated client-side)
  garment_id: string;       // GarmentDB.id
  garment_name: string;     // Để hiển thị trong drawer
  image_url: string;        // Thumbnail
  transaction_type: CartTransactionType;
  // For buy:
  size?: string;            // Size được chọn
  // For rent:
  start_date?: string;      // ISO date string "YYYY-MM-DD"
  end_date?: string;        // ISO date string "YYYY-MM-DD"
  rental_days?: number;     // Tính từ start/end
  // Pricing:
  unit_price: number;       // rental_price/day HOẶC sale_price
  total_price: number;      // unit_price × days (rent) hoặc unit_price (buy)
}

export interface CartAppliedVoucher {
  /** user_vouchers.id */
  id: string;
  /** vouchers.id */
  voucher_id: string;
  code: string;
  type: "percent" | "fixed";
  visibility: "public" | "private";
  value: number;
  discount_amount: number;
}

export interface CartState {
  items: CartItem[];
  appliedVouchers: CartAppliedVoucher[];
  /** Story 10.2: Whether bespoke measurement has been confirmed via gate */
  measurement_confirmed: boolean;
}

export interface CartStore extends CartState {
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  cartCount: () => number;
  cartTotal: () => number;
  applyVoucher: (voucher: CartAppliedVoucher) => void;
  removeVoucher: (voucherId: string) => void;
  clearVouchers: () => void;
  totalDiscount: () => number;
  finalTotal: () => number;
  /** Story 10.2: Set measurement confirmation state */
  setMeasurementConfirmed: (confirmed: boolean) => void;
  /** Story 10.2: Check if cart contains bespoke items */
  hasBespokeItems: () => boolean;
}
