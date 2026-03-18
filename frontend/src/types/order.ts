/**
 * Order types - Story 3.3: Checkout Information & Payment Gateway
 * Extended for Story 4.2: Owner Order Board
 */

export type PaymentMethod = "cod" | "vnpay" | "momo";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface ShippingAddress {
  province: string;
  district: string;
  ward: string;
  address_detail: string;
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  shipping_note?: string;
  payment_method: PaymentMethod;
  items: {
    garment_id: string;
    transaction_type: "buy" | "rent";
    size?: string;
    start_date?: string;
    end_date?: string;
    rental_days?: number;
  }[];
}

export interface OrderItemResponse {
  garment_id: string;
  garment_name: string;
  image_url: string | null;
  transaction_type: "buy" | "rent";
  size?: string | null;
  rental_days?: number | null;
  unit_price: number;
  total_price: number;
}

export interface OrderResponse {
  id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_url?: string | null;
  customer_name: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  shipping_note?: string | null;
  items: OrderItemResponse[];
  created_at: string;
}

// ---------------------------------------------------------------------------
// Story 4.2: Owner Order Board types
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface OrderListItem {
  id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  payment_method: PaymentMethod;
  customer_name: string;
  customer_phone: string;
  transaction_types: string[];
  created_at: string;
  next_valid_status: string | null;
}

export interface OrderListParams {
  status?: OrderStatus[];
  payment_status?: PaymentStatus[];
  transaction_type?: "buy" | "rent";
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: "created_at" | "total_amount" | "status";
  sort_order?: "asc" | "desc";
}

export interface OrderListResponse {
  data: OrderListItem[];
  meta: {
    pagination: PaginationMeta;
  };
}

export interface PaymentTransactionItem {
  id: string;
  order_id: string;
  provider: string;
  transaction_id: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface OrderDetailResponse {
  order: OrderResponse;
  transactions: PaymentTransactionItem[];
}

// ---------------------------------------------------------------------------
// Story 4.4c: Customer-facing Order History types
// ---------------------------------------------------------------------------

export type CustomerOrderStatus =
  | "pending"
  | "confirmed"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "overdue";

export type OrderType = "buy" | "rental" | "mixed";

export interface CustomerOrderItem {
  garment_id: string;
  garment_name: string;
  image_url: string | null;
  transaction_type: "buy" | "rent";
  size?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  // Rental-specific
  start_date?: string | null;
  end_date?: string | null;
  rental_days?: number | null;
  rental_status?: string | null;
  deposit_amount?: number | null;
}

export interface OrderTimelineEntry {
  status: string;
  timestamp: string;
  description: string;
}

export interface CustomerOrderDeliveryInfo {
  recipient_name: string;
  phone: string;
  address: string;
  notes?: string | null;
}

export interface CustomerOrderSummary {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  order_type: OrderType;
  created_at: string;
}

export interface CustomerOrderDetail extends CustomerOrderSummary {
  payment_method: string;
  shipping_note?: string | null;
  items: CustomerOrderItem[];
  delivery_info: CustomerOrderDeliveryInfo;
  timeline: OrderTimelineEntry[];
}

export interface CustomerOrderListMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CustomerOrderListResponse {
  data: CustomerOrderSummary[];
  meta: CustomerOrderListMeta;
}

export interface CustomerOrderFilter {
  status?: string;
  order_type?: "buy" | "rental";
  date_from?: string;
  date_to?: string;
  search?: string;
}
