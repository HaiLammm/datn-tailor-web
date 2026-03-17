"use client";

/**
 * Rental Filters Component (Story 4.3)
 * Status filter dropdown, search with debounce, URL state sync
 */

import { useEffect, useState } from "react";
import type { RentalListParams, RentalStatus } from "@/types/rental";

interface RentalFiltersProps {
  params: RentalListParams;
  onFilterChange: (params: Partial<RentalListParams>) => void;
  isLoading?: boolean;
}

export function RentalFilters({
  params,
  onFilterChange,
  isLoading = false,
}: RentalFiltersProps) {
  const [search, setSearch] = useState(params.search || "");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Debounce search input
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);

    const timeout = setTimeout(() => {
      onFilterChange({ search: search || undefined, page: 1 });
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [search, onFilterChange]);

  const statusOptions: Array<{ value: RentalStatus | ""; label: string }> = [
    { value: "", label: "Tất Cả" },
    { value: "active", label: "Đang Thuê" },
    { value: "overdue", label: "Quá Hạn" },
    { value: "returned", label: "Đã Trả" },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Trạng Thái
          </label>
          <select
            value={params.status || ""}
            onChange={(e) =>
              onFilterChange({
                status: (e.target.value as RentalStatus) || undefined,
                page: 1,
              })
            }
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Tìm Kiếm (Tên Áo, Khách Hàng, SĐT)
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nhập tên áo, khách hàng hoặc số điện thoại..."
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>
      </div>

      {/* Sort Option (optional visual indicator) */}
      <div className="text-sm text-gray-600">
        Sắp xếp theo: Hạn trả{" "}
        {params.sort_by === "days_remaining" && "Ngày còn lại"}
      </div>
    </div>
  );
}
