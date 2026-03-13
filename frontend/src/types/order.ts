/**
 * Order types - Story 3.3: Checkout Information & Payment Gateway
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
