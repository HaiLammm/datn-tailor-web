/**
 * TypeScript types for Garment (Story 5.1: Digital Showroom, Story 5.2: Return Timeline)
 * 
 * Snake_case field names match backend JSON response format.
 */

export enum GarmentStatus {
  AVAILABLE = "available",
  RENTED = "rented",
  MAINTENANCE = "maintenance",
}

export enum GarmentCategory {
  AO_DAI_TRUYEN_THONG = "ao_dai_truyen_thong",
  AO_DAI_CACH_TAN = "ao_dai_cach_tan",
  AO_DAI_CUOI = "ao_dai_cuoi",
  AO_DAI_TE_NHI = "ao_dai_te_nhi",
}

export enum GarmentMaterial {
  LUA = "lua",
  GIAM = "giam",
  NHUNG = "nhung",
  VOAN = "voan",
  SATIN = "satin",
  COTTON = "cotton",
  PHA = "pha",
}

export enum GarmentOccasion {
  LE_CUOI = "le_cuoi",
  KHAI_TRUONG = "khai_truong",
  TET = "tet",
  CONG_SO = "cong_so",
  TIEC_TUNG = "tiec_tung",
  SINH_NHAT = "sinh_nhat",
}

export interface Garment {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: string;
  color: string | null;
  occasion: string | null;
  material: string | null;
  size_options: string[];
  rental_price: string;
  /** Story 2.2: Giá bán (VND), null nếu chỉ có thuê */
  sale_price: string | null;
  image_url: string | null;
  /** Story 2.2: Danh sách URL ảnh HD (multi-image gallery) */
  image_urls: string[];
  status: string;
  expected_return_date: string | null;
  /** Computed by backend: days until available (negative = overdue). Null if no expected_return_date. */
  days_until_available: number | null;
  /** Computed by backend: true if rented and expected_return_date is in the past. */
  is_overdue: boolean;
  /** Story 5.4: FK to customer who rented this garment */
  renter_id: string | null;
  /** Story 5.4: Cached renter name for display */
  renter_name: string | null;
  /** Story 5.4: Cached renter email for notifications */
  renter_email: string | null;
  /** Story 5.4: When return reminder was sent (ISO timestamp, null = not sent) */
  reminder_sent_at: string | null;
  /** Story 5.4: Computed by backend - true if reminder_sent_at is not null */
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface GarmentFilter {
  color?: string | null;
  occasion?: GarmentOccasion | null;
  status?: GarmentStatus | null;
  category?: GarmentCategory | null;
  material?: GarmentMaterial | null;
  size?: string | null;
  /** Story 2.4: Tìm kiếm theo tên sản phẩm */
  name?: string | null;
  page?: number;
  page_size?: number;
}

export interface GarmentListResponse {
  items: Garment[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GarmentApiResponse {
  data: GarmentListResponse;
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export interface GarmentDetailApiResponse {
  data: Garment;
}
