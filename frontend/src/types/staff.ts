/**
 * TypeScript types for Staff Whitelist Management
 * Story 1.4: Quản lý & Tạo tài khoản Nhân viên
 * 
 * IMPORTANT: Use snake_case for JSON fields to match backend SSOT
 */

export interface StaffWhitelistEntry {
    id: string;
    email: string;
    role: "Tailor" | "Owner";
    created_by: string | null;
    created_at: string;
}

export interface ActiveStaffUser {
    id: string;
    email: string;
    role: "Tailor" | "Owner";
    full_name: string | null;
    is_active: boolean;
    created_at: string;
}

export interface StaffManagementResponse {
    whitelist: StaffWhitelistEntry[];
    active_staff: ActiveStaffUser[];
}

export interface StaffWhitelistCreateRequest {
    email: string;
    role: "Tailor" | "Owner";
}
