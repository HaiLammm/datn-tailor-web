"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StaffManagementResponse } from "@/types/staff";
import AddStaffForm from "./AddStaffForm";

/**
 * Staff Management Table - Client Component
 * Story 1.4: Quản lý & Tạo tài khoản Nhân viên
 * 
 * Features:
 * - Display staff whitelist and active staff directory
 * - Add new staff to whitelist (Owner only)
 * - Remove staff from whitelist (Owner only)
 * - Show staff status (whitelist vs registered)
 */
export default function StaffTable() {
    const queryClient = useQueryClient();
    const [showAddForm, setShowAddForm] = useState(false);

    // Fetch staff data from API
    const { data, isLoading, error } = useQuery<StaffManagementResponse>({
        queryKey: ["staff"],
        queryFn: async () => {
            const response = await fetch("/api/v1/staff/", {
                credentials: "include", // Include cookies for auth
            });

            if (!response.ok) {
                throw new Error("Failed to fetch staff data");
            }

            return response.json();
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (entryId: string) => {
            const response = await fetch(`/api/v1/staff/${entryId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to remove staff");
            }
        },
        onSuccess: () => {
            // Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: ["staff"] });
        },
    });

    const handleDeleteClick = (entryId: string, email: string) => {
        if (window.confirm(`Xác nhận xóa ${email} khỏi danh sách nhân viên?`)) {
            deleteMutation.mutate(entryId);
        }
    };

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Lỗi khi tải danh sách nhân viên. Vui lòng thử lại.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-indigo-900">Quản lý Nhân sự</h2>
                    <p className="text-gray-600 mt-1">
                        Danh sách nhân viên có quyền truy cập hệ thống
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    Thêm nhân viên
                </button>
            </div>

            {/* Add Staff Form */}
            {showAddForm && (
                <AddStaffForm
                    onSuccess={() => setShowAddForm(false)}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {/* Staff Whitelist Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Danh sách Được phép (Staff Whitelist)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Email trong danh sách này sẽ được gán quyền tự động khi đăng nhập
                    </p>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p className="text-gray-500 mt-2">Đang tải...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vai trò
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tạo bởi
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ngày thêm
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data?.whitelist?.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            Chưa có nhân viên nào trong whitelist
                                        </td>
                                    </tr>
                                ) : (
                                    data?.whitelist?.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {entry.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        entry.role === "Owner"
                                                            ? "bg-amber-100 text-amber-800"
                                                            : "bg-indigo-100 text-indigo-800"
                                                    }`}
                                                >
                                                    {entry.role === "Owner" ? "Chủ tiệm" : "Thợ may"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {entry.created_by || "—"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(entry.created_at).toLocaleDateString("vi-VN")}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleDeleteClick(entry.id, entry.email)}
                                                    disabled={deleteMutation.isPending}
                                                    className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Active Staff Directory Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-emerald-100">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Nhân viên Đang Hoạt động
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Những người đã đăng ký tài khoản và có quyền nhân viên
                    </p>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        <p className="text-gray-500 mt-2">Đang tải...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Họ tên
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vai trò
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Trạng thái
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Đăng ký
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data?.active_staff?.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            Chưa có nhân viên nào đã đăng ký
                                        </td>
                                    </tr>
                                ) : (
                                    data?.active_staff?.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {user.full_name || "—"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        user.role === "Owner"
                                                            ? "bg-amber-100 text-amber-800"
                                                            : "bg-indigo-100 text-indigo-800"
                                                    }`}
                                                >
                                                    {user.role === "Owner" ? "Chủ tiệm" : "Thợ may"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        user.is_active
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                    }`}
                                                >
                                                    {user.is_active ? "Hoạt động" : "Vô hiệu hóa"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(user.created_at).toLocaleDateString("vi-VN")}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Error message for delete mutation */}
            {deleteMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">
                        {(deleteMutation.error as Error).message || "Lỗi khi xóa nhân viên. Vui lòng thử lại."}
                    </p>
                </div>
            )}
        </div>
    );
}
