"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StaffWhitelistCreateRequest, StaffWhitelistEntry } from "@/types/staff";

/**
 * Add Staff Form - Client Component
 * Story 1.4: Quản lý & Tạo tài khoản Nhân viên
 * 
 * Features:
 * - Add new staff email to whitelist
 * - Validate email format
 * - Assign role (Tailor or Owner)
 */

interface AddStaffFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export default function AddStaffForm({ onSuccess, onCancel }: AddStaffFormProps) {
    const queryClient = useQueryClient();
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"Tailor" | "Owner">("Tailor");

    // Add staff mutation
    const addMutation = useMutation({
        mutationFn: async (data: StaffWhitelistCreateRequest) => {
            const response = await fetch("/api/v1/staff/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to add staff member");
            }

            return response.json();
        },
        onSuccess: () => {
            // Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: ["staff"] });
            setEmail("");
            setRole("Tailor");
            onSuccess();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addMutation.mutate({ email, role });
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Thêm nhân viên mới vào whitelist
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nhanvien@example.com"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {/* Role Select */}
                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                        Vai trò
                    </label>
                    <select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as "Tailor" | "Owner")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="Tailor">Thợ may (Tailor)</option>
                        <option value="Owner">Chủ tiệm (Owner)</option>
                    </select>
                </div>

                {/* Error Message */}
                {addMutation.isError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">
                            {(addMutation.error as Error).message || "Lỗi khi thêm nhân viên. Vui lòng thử lại."}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={addMutation.isPending || !email}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {addMutation.isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Đang thêm...
                            </>
                        ) : (
                            "Thêm nhân viên"
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={addMutation.isPending}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Hủy
                    </button>
                </div>
            </form>
        </div>
    );
}
