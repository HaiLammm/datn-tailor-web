"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StaffWhitelistCreateRequest, StaffCreateResponse } from "@/types/staff";

/**
 * Add Staff Form - Client Component
 * Story 1.4: Quản lý & Tạo tài khoản Nhân viên
 *
 * Features:
 * - Add new staff email to whitelist
 * - Validate email format
 * - Assign role (Tailor or Owner)
 * - Optional password or auto-generate default
 * - Show password after creation for Owner to share
 */

interface AddStaffFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export default function AddStaffForm({ onSuccess, onCancel }: AddStaffFormProps) {
    const queryClient = useQueryClient();
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"Tailor" | "Owner">("Tailor");
    const [password, setPassword] = useState("");
    const [createdResult, setCreatedResult] = useState<StaffCreateResponse | null>(null);
    const [copied, setCopied] = useState(false);

    // Add staff mutation
    const addMutation = useMutation({
        mutationFn: async (data: StaffWhitelistCreateRequest): Promise<StaffCreateResponse> => {
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
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["staff"] });
            setCreatedResult(data);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: StaffWhitelistCreateRequest = { email, role };
        if (password.trim()) {
            payload.password = password;
        }
        addMutation.mutate(payload);
    };

    const handleCopyPassword = async () => {
        if (createdResult) {
            await navigator.clipboard.writeText(createdResult.plain_password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDone = () => {
        setEmail("");
        setRole("Tailor");
        setPassword("");
        setCreatedResult(null);
        setCopied(false);
        onSuccess();
    };

    // Show success result with password
    if (createdResult) {
        return (
            <div className="bg-white rounded-2xl shadow-xl border border-green-200 p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">
                    Thêm nhân viên thành công!
                </h3>

                <div className="space-y-3 mb-4">
                    <div>
                        <span className="text-sm font-medium text-gray-600">Email: </span>
                        <span className="text-sm text-gray-900">{createdResult.whitelist_entry.email}</span>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-600">Vai trò: </span>
                        <span className="text-sm text-gray-900">
                            {createdResult.whitelist_entry.role === "Tailor" ? "Thợ may" : "Chủ tiệm"}
                        </span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-amber-800 mb-2">
                            Mật khẩu đăng nhập (vui lòng gửi cho nhân viên):
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-white px-3 py-2 rounded border border-amber-300 text-base font-mono text-gray-900">
                                {createdResult.plain_password}
                            </code>
                            <button
                                type="button"
                                onClick={handleCopyPassword}
                                className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                            >
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleDone}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    Xong
                </button>
            </div>
        );
    }

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

                {/* Password Input */}
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Mật khẩu
                    </label>
                    <input
                        type="text"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Để trống để dùng mật khẩu mặc định (Tailor@123)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Nếu để trống, hệ thống sẽ tạo mật khẩu mặc định.
                    </p>
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
