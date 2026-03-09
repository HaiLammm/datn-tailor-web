/**
 * TypeScript types for Garment (Story 5.1: Digital Showroom)
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
  size_options: string[];
  rental_price: string;
  image_url: string | null;
  status: string;
  expected_return_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface GarmentFilter {
  color?: string | null;
  occasion?: GarmentOccasion | null;
  status?: GarmentStatus | null;
  category?: GarmentCategory | null;
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
