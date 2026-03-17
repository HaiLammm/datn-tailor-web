/**
 * KPI Dashboard TypeScript interfaces (Story 5.1)
 * Matches backend Pydantic models in backend/src/models/kpi.py
 */

export interface RevenueSummary {
  daily: number;
  daily_previous: number;
  daily_trend: number;
  weekly: number;
  weekly_previous: number;
  weekly_trend: number;
  monthly: number;
  monthly_previous: number;
  monthly_trend: number;
}

export interface OrderStatusCount {
  status: string;
  count: number;
}

export interface OrderTypeCount {
  transaction_type: string;
  count: number;
}

export interface OrderStats {
  total: number;
  by_status: OrderStatusCount[];
  by_type: OrderTypeCount[];
}

export interface ProductionAlert {
  order_id: string;
  customer_name: string;
  garment_name: string;
  order_date: string;
  days_since_order: number;
}

export interface AppointmentToday {
  id: string;
  customer_name: string;
  customer_phone: string;
  slot: string;
  status: string;
  special_requests: string | null;
}

export interface DailyRevenue {
  date: string;
  amount: number;
}

export interface KPIQuickGlance {
  revenue: RevenueSummary;
  orders: OrderStats;
  production_alerts: ProductionAlert[];
  appointments_today: AppointmentToday[];
  revenue_chart: DailyRevenue[];
}

export interface KPIApiResponse {
  data: KPIQuickGlance;
  meta: Record<string, unknown>;
}
