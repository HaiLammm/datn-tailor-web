"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CustomerListResponse, CustomerProfileResponse } from "@/types/customer";

/**
 * Customer List Table - Client Component
 * Story 1.3: Quản lý Hồ sơ & Số đo
 * 
 * Features:
 * - Display customers in table format
 * - Search by name, phone, email
 * - Pagination
 * - Navigate to customer detail
 */
export default function CustomerListTable() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const limit = 20;

    // Debounce search input
    const handleSearchChange = (value: string) => {
        setSearch(value);
        const timer = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(1); // Reset to first page on search
        }, 300);
        return () => clearTimeout(timer);
    };

    // Fetch customers from API
    const { data, isLoading, error } = useQuery<CustomerListResponse>({
        queryKey: ["customers", debouncedSearch, page, limit],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });
            if (debouncedSearch) {
                params.append("search", debouncedSearch);
            }

            const response = await fetch(`/api/v1/customers?${params.toString()}`, {
                credentials: "include", // Include cookies for auth
            });

            if (!response.ok) {
                throw new Error("Failed to fetch customers");
            }

            return response.json();
        },
    });

    const handleRowClick = (customerId: string) => {
        router.push(`/owner/customers/${customerId}`);
    };

    const handleNewCustomer = () => {
        router.push("/owner/customers/new");
    };

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Lỗi khi tải danh sách khách hàng. Vui lòng thử lại.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-indigo-100">
            {/* Header with Search and New Button */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Search Box */}
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg
                                className="h-5 w-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm theo tên, SĐT, email..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* New Customer Button */}
                    <button
                        onClick={handleNewCustomer}
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
                        Thêm khách hàng
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Họ tên
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Số điện thoại
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tài khoản
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Số đo
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            // Loading skeleton
                            Array.from({ length: 5 }).map((_, idx) => (
                                <tr key={idx}>
                                    <td colSpan={5} className="px-6 py-4">
                                        <div className="animate-pulse flex space-x-4">
                                            <div className="flex-1 space-y-2 py-1">
                                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : data?.customers && data.customers.length > 0 ? (
                            // Customer rows
                            data.customers.map((customer: CustomerProfileResponse) => (
                                <tr
                                    key={customer.id}
                                    onClick={() => handleRowClick(customer.id)}
                                    className="hover:bg-indigo-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {customer.full_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{customer.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {customer.email || "—"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {customer.has_account ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Có tài khoản
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                Chưa có
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {customer.measurement_count > 0 ? (
                                                <span className="text-indigo-600 font-medium">
                                                    {customer.measurement_count} bộ
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">Chưa có</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            // Empty state
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center">
                                        <svg
                                            className="w-16 h-16 text-gray-300 mb-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                            />
                                        </svg>
                                        <p className="text-gray-500 text-lg">
                                            {debouncedSearch
                                                ? "Không tìm thấy khách hàng"
                                                : "Chưa có khách hàng nào"}
                                        </p>
                                        <p className="text-gray-400 text-sm mt-1">
                                            Nhấn "Thêm khách hàng" để bắt đầu
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Hiển thị {((page - 1) * limit) + 1} - {Math.min(page * limit, data.total)} trong tổng {data.total} khách hàng
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Trước
                            </button>
                            <span className="px-3 py-1 text-sm text-gray-700">
                                Trang {page} / {data.total_pages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                                disabled={page === data.total_pages}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
