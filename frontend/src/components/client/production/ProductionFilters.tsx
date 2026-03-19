"use client";

import type { ActiveStaffUser } from "@/types/staff";
import type { OwnerTaskFilters } from "@/types/tailor-task";

interface ProductionFiltersProps {
  filters: OwnerTaskFilters;
  onFiltersChange: (filters: OwnerTaskFilters) => void;
  tailors: ActiveStaffUser[];
}

export default function ProductionFilters({
  filters,
  onFiltersChange,
  tailors,
}: ProductionFiltersProps) {
  const activeTailors = tailors.filter((s) => s.role === "Tailor" && s.is_active);

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="production-filters">
      {/* Tailor filter */}
      <select
        value={filters.assigned_to || ""}
        onChange={(e) =>
          onFiltersChange({ ...filters, assigned_to: e.target.value || undefined })
        }
        className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-[#1A1A2E] focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
        data-testid="filter-tailor"
      >
        <option value="">Tất cả thợ may</option>
        {activeTailors.map((t) => (
          <option key={t.id} value={t.id}>
            {t.full_name || t.email}
          </option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={filters.status || ""}
        onChange={(e) =>
          onFiltersChange({ ...filters, status: e.target.value || undefined })
        }
        className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-[#1A1A2E] focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
        data-testid="filter-status"
      >
        <option value="">Tất cả trạng thái</option>
        <option value="assigned">Chờ nhận</option>
        <option value="in_progress">Đang làm</option>
        <option value="completed">Hoàn thành</option>
        <option value="overdue">Quá hạn</option>
      </select>

      {/* Clear filters */}
      {(filters.assigned_to || filters.status || filters.overdue_only) && (
        <button
          onClick={() => onFiltersChange({})}
          className="text-sm text-gray-500 hover:text-[#1A1A2E] underline"
          data-testid="filter-clear"
        >
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
}
