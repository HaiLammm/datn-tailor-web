/**
 * Customer Profile and Measurements - TypeScript types and Zod schemas
 * Story 1.3: Quản lý Hồ sơ & Số đo
 */

import { z } from "zod";

// ===== Validation Schemas =====

/**
 * Vietnamese phone number validation
 * Format: 0XXXXXXXXX (10-11 digits)
 */
const phoneSchema = z
  .string()
  .min(10, "Số điện thoại phải có ít nhất 10 số")
  .max(11, "Số điện thoại không được quá 11 số")
  .regex(/^0[0-9]{9,10}$/, "Số điện thoại không đúng định dạng (VD: 0901234567)");

/**
 * Measurement field validation with range
 */
const measurementFieldSchema = (min: number, max: number, fieldName: string) =>
  z
    .number()
    .min(min, `${fieldName} phải lớn hơn ${min}cm`)
    .max(max, `${fieldName} phải nhỏ hơn ${max}cm`)
    .positive(`${fieldName} phải là số dương`)
    .optional();

// ===== Measurement Schemas =====

/**
 * Schema for creating a new measurement set
 */
export const measurementCreateSchema = z.object({
  neck: measurementFieldSchema(20, 60, "Vòng cổ"),
  shoulder_width: measurementFieldSchema(30, 60, "Rộng vai"),
  bust: measurementFieldSchema(60, 180, "Vòng ngực"),
  waist: measurementFieldSchema(40, 150, "Vòng eo"),
  hip: measurementFieldSchema(60, 180, "Vòng mông"),
  top_length: measurementFieldSchema(40, 120, "Dài áo"),
  sleeve_length: measurementFieldSchema(30, 90, "Dài tay"),
  wrist: measurementFieldSchema(10, 30, "Vòng cổ tay"),
  height: measurementFieldSchema(100, 250, "Chiều cao"),
  weight: z
    .number()
    .min(30, "Cân nặng phải lớn hơn 30kg")
    .max(200, "Cân nặng phải nhỏ hơn 200kg")
    .positive("Cân nặng phải là số dương")
    .optional(),
  measurement_notes: z.string().optional(),
  measured_date: z.string().optional(), // ISO date string
});

export type MeasurementCreateInput = z.infer<typeof measurementCreateSchema>;

/**
 * Schema for updating measurement
 */
export const measurementUpdateSchema = measurementCreateSchema.partial();

export type MeasurementUpdateInput = z.infer<typeof measurementUpdateSchema>;

/**
 * Measurement response from API
 */
export interface MeasurementResponse {
  id: string;
  customer_profile_id: string;
  tenant_id: string;
  neck: number | null;
  shoulder_width: number | null;
  bust: number | null;
  waist: number | null;
  hip: number | null;
  top_length: number | null;
  sleeve_length: number | null;
  wrist: number | null;
  height: number | null;
  weight: number | null;
  measurement_notes: string | null;
  is_default: boolean;
  measured_date: string; // ISO date string
  measured_by: string | null;
  created_at: string;
  updated_at: string;
}

// ===== Customer Profile Schemas =====

/**
 * Schema for creating a customer profile
 */
export const customerProfileCreateSchema = z.object({
  full_name: z
    .string()
    .min(2, "Họ tên phải có ít nhất 2 ký tự")
    .max(255, "Họ tên không được quá 255 ký tự"),
  phone: phoneSchema,
  email: z.string().email("Email không đúng định dạng").optional().or(z.literal("")),
  date_of_birth: z.string().optional(), // ISO date string
  gender: z.enum(["Nam", "Nữ", "Khác"]).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  initial_measurements: measurementCreateSchema.optional(),
  create_account: z.boolean().optional(), // Checkbox: Tạo tài khoản cho khách hàng
});

export type CustomerProfileCreateInput = z.infer<typeof customerProfileCreateSchema>;

/**
 * Schema for updating customer profile
 */
export const customerProfileUpdateSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  phone: phoneSchema.optional(),
  email: z.string().email().optional().or(z.literal("")),
  date_of_birth: z.string().optional(),
  gender: z.enum(["Nam", "Nữ", "Khác"]).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type CustomerProfileUpdateInput = z.infer<typeof customerProfileUpdateSchema>;

/**
 * Customer profile response from API
 */
export interface CustomerProfileResponse {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  has_account: boolean; // Computed field
  measurement_count: number; // Computed field
}

/**
 * Customer with measurements response
 */
export interface CustomerWithMeasurementsResponse {
  customer: CustomerProfileResponse;
  measurements: MeasurementResponse[];
  default_measurement: MeasurementResponse | null;
}

/**
 * Paginated customer list response
 */
export interface CustomerListResponse {
  customers: CustomerProfileResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ===== API Error Types =====

export interface ApiError {
  detail: string;
}

export interface ValidationError {
  detail: Array<{
    loc: string[];
    msg: string;
    type: string;
  }>;
}
