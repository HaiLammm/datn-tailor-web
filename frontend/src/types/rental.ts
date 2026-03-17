/**
 * Rental Management Types (Story 4.3)
 */

export type RentalStatus = "active" | "overdue" | "returned";
export type ReturnCondition = "good" | "damaged" | "lost";

export interface RentalListItem {
  order_item_id: string;
  garment_id: string;
  garment_name: string;
  customer_name: string;
  customer_phone: string;
  start_date: string; // ISO date
  end_date: string; // ISO date
  rental_days: number;
  days_remaining: number;
  rental_status: RentalStatus;
  deposit_amount: string; // Decimal as string
  unit_price: string; // Decimal as string
  image_url: string | null;
}

export interface RentalListParams {
  status?: RentalStatus;
  search?: string;
  sort_by?: "end_date" | "days_remaining" | "customer_name";
  page?: number;
  page_size?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RentalListResponse {
  data: RentalListItem[];
  meta: {
    pagination: PaginationMeta;
  };
}

export interface RentalStats {
  active_rentals: number;
  overdue_rentals: number;
  due_this_week: number;
  returned_this_month: number;
}

export interface ProcessReturnInput {
  return_condition: ReturnCondition;
  damage_notes?: string;
  deposit_deduction: string; // Decimal as string
}

export interface ProcessReturnResponse {
  order_item_id: string;
  garment_id: string;
  return_condition: ReturnCondition;
  deposit_deduction: string;
  damage_notes: string | null;
  returned_at: string; // ISO datetime
}

export interface RentalReturnHistory {
  return_condition: ReturnCondition;
  damage_notes: string | null;
  returned_at: string;
}

export interface RentalDetailResponse {
  order_item_id: string;
  garment_id: string;
  garment_name: string;
  image_url: string | null;
  category: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  start_date: string;
  end_date: string;
  rental_days: number;
  days_remaining: number;
  rental_status: RentalStatus;
  deposit_amount: string;
  unit_price: string;
  order_id: string;
  return_history: RentalReturnHistory | null;
}
