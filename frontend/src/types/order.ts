/**
 * Order types - Story 3.3: Checkout Information & Payment Gateway
 * Extended for Story 4.2: Owner Order Board
 */

export type PaymentMethod = "cod" | "vnpay" | "momo" | "internal";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "checked"
  | "shipped"
  | "delivered"
  | "cancelled"
  // Epic 10: new statuses
  | "pending_measurement"
  | "preparing"
  | "ready_to_ship"
  | "ready_for_pickup"
  | "in_production"
  | "renting"
  | "returned"
  | "completed";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface ShippingAddress {
  province: string;
  district: string;
  ward: string;
  address_detail: string;
}

export type ServiceType = "buy" | "rent" | "bespoke";
export type SecurityType = "cccd" | "cash_deposit";

export interface RentalCheckoutFields {
  pickup_date: string;
  return_date: string;
  security_type: SecurityType;
  security_value: string;
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  shipping_note?: string;
  payment_method: PaymentMethod;
  items: {
    garment_id: string;
    transaction_type: "buy" | "rent" | "bespoke";
    size?: string;
    start_date?: string;
    end_date?: string;
    rental_days?: number;
  }[];
  voucher_codes?: string[];
  rental_fields?: RentalCheckoutFields;
  measurement_confirmed?: boolean;
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
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  applied_voucher_ids: string[];
  payment_method: PaymentMethod;
  payment_url?: string | null;
  customer_name: string;
  customer_phone: string;
  shipping_address: ShippingAddress | null;
  shipping_note?: string | null;
  is_internal?: boolean;
  items: OrderItemResponse[];
  created_at: string;
  tailor_info?: TailorInfoForCustomer[] | null;
  service_type?: ServiceType;
  deposit_amount?: number | null;
  remaining_amount?: number | null;
  security_type?: string | null;
  security_value?: string | null;
  pickup_date?: string | null;
  return_date?: string | null;
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

export interface InternalOrderInput {
  items: { garment_id: string; transaction_type: "buy"; size?: string }[];
  notes?: string;
}

export interface OrderListItem {
  id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  customer_name: string;
  customer_phone: string;
  is_internal?: boolean;
  transaction_types: string[];
  created_at: string;
  next_valid_status: string | null;
  // Epic 10: service type for badge display
  service_type?: ServiceType;
  // Story 10.5: preparation sub-step tracking
  preparation_step?: string | null;
}

// ---------------------------------------------------------------------------
// Story 10.4: Owner Approve & Auto-routing types
// ---------------------------------------------------------------------------

export interface ApproveOrderRequest {
  assigned_to?: string;  // Tailor UUID — required for bespoke
  notes?: string;
}

export interface ApproveOrderResponse {
  order_id: string;
  new_status: string;
  service_type: string;
  routing_destination: string;  // "tailor" | "warehouse"
  task_id?: string | null;
}

// Story 10.5: Preparation sub-step constants
export const RENT_PREP_STEPS = [
  { key: "cleaning", label: "Giặt/Là" },
  { key: "altering", label: "Chỉnh sửa" },
  { key: "ready", label: "Sẵn sàng" },
] as const;

export const BUY_PREP_STEPS = [
  { key: "qc", label: "Kiểm tra CL" },
  { key: "packaging", label: "Đóng gói" },
  { key: "ready", label: "Sẵn sàng" },
] as const;

export interface UpdatePreparationStepRequest {
  preparation_step: string;
  delivery_mode?: "ship" | "pickup";
}

export interface UpdatePreparationStepResponse {
  order_id: string;
  preparation_step: string | null;
  status: string;
  service_type: string;
  is_completed: boolean;
}

export interface OrderListParams {
  status?: OrderStatus[];
  payment_status?: PaymentStatus[];
  transaction_type?: "buy" | "rent" | "bespoke";
  is_internal?: boolean;
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
  | "in_progress"
  | "checked"
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

export interface TailorInfoForCustomer {
  full_name: string;
  avatar_url: string | null;
  role: string;
  experience_years: number | null;
  production_step: string;
  garment_name: string;
}

export interface CustomerOrderDetail extends CustomerOrderSummary {
  payment_method: string;
  shipping_note?: string | null;
  items: CustomerOrderItem[];
  delivery_info: CustomerOrderDeliveryInfo;
  timeline: OrderTimelineEntry[];
  tailor_info: TailorInfoForCustomer[] | null;
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
