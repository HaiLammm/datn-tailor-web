"use client";

import type { TaskFilters } from "@/types/tailor-task";
import { useState } from "react";

interface TaskFiltersProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "assigned", label: "Chờ nhận" },
  { value: "in_progress", label: "Đang làm" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

const MONTH_OPTIONS = [
  { value: 1, label: "Tháng 1" },
  { value: 2, label: "Tháng 2" },
  { value: 3, label: "Tháng 3" },
  { value: 4, label: "Tháng 4" },
  { value: 5, label: "Tháng 5" },
  { value: 6, label: "Tháng 6" },
  { value: 7, label: "Tháng 7" },
  { value: 8, label: "Tháng 8" },
  { value: 9, label: "Tháng 9" },
  { value: 10, label: "Tháng 10" },
  { value: 11, label: "Tháng 11" },
  { value: 12, label: "Tháng 12" },
];

export default function TaskFilters({ filters, onFiltersChange }: TaskFiltersProps) {
  const [localDateFrom, setLocalDateFrom] = useState(filters.date_from || "");
  const [localDateTo, setLocalDateTo] = useState(filters.date_to || "");
  const [localMonth, setLocalMonth] = useState<number | undefined>(filters.month);
  const [localYear, setLocalYear] = useState<number | undefined>(filters.year);

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value || undefined,
    });
  };

  const handleDateFromChange = (value: string) => {
    setLocalDateFrom(value);
    onFiltersChange({
      ...filters,
      date_from: value || undefined,
      month: undefined,
      year: undefined,
    });
  };

  const handleDateToChange = (value: string) => {
    setLocalDateTo(value);
    onFiltersChange({
      ...filters,
      date_to: value || undefined,
      month: undefined,
      year: undefined,
    });
  };

  const handleMonthChange = (value: string) => {
    const month = value ? parseInt(value, 10) : undefined;
    setLocalMonth(month);
    onFiltersChange({
      ...filters,
      month,
      date_from: undefined,
      date_to: undefined,
    });
  };

  const handleYearChange = (value: string) => {
    const year = value ? parseInt(value, 10) : undefined;
    setLocalYear(year);
    onFiltersChange({
      ...filters,
      year,
      date_from: undefined,
      date_to: undefined,
    });
  };

  const handleClearDateRange = () => {
    setLocalDateFrom("");
    setLocalDateTo("");
    onFiltersChange({
      ...filters,
      date_from: undefined,
      date_to: undefined,
    });
  };

  const handleThisMonth = () => {
    const now = new Date();
    setLocalMonth(now.getMonth() + 1);
    setLocalYear(now.getFullYear());
    onFiltersChange({
      ...filters,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      date_from: undefined,
      date_to: undefined,
    });
  };

  const handleLastMonth = () => {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    setLocalMonth(lastMonth);
    setLocalYear(year);
    onFiltersChange({
      ...filters,
      month: lastMonth,
      year,
      date_from: undefined,
      date_to: undefined,
    });
  };

  const hasDateRange = !!filters.date_from || !!filters.date_to;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Trạng thái:
          </label>
          <select
            value={filters.status || ""}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2B4C] focus:border-transparent min-w-[160px]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Khoảng thời gian:
          </label>
          <input
            type="date"
            value={localDateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2B4C] focus:border-transparent"
            placeholder="Từ ngày"
          />
          <span className="text-sm text-gray-500">đến</span>
          <input
            type="date"
            value={localDateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2B4C] focus:border-transparent"
            placeholder="Đến ngày"
          />
          {hasDateRange && (
            <button
              onClick={handleClearDateRange}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 underline"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Month/Year */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Theo tháng/năm:
          </label>
          <select
            value={localMonth || ""}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2B4C] focus:border-transparent"
          >
            <option value="">Tháng</option>
            {MONTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={localYear || ""}
            onChange={(e) => handleYearChange(e.target.value)}
            placeholder="Năm"
            min={2020}
            max={2030}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2B4C] focus:border-transparent w-24"
          />
          <button
            onClick={handleThisMonth}
            className="px-3 py-2 text-sm bg-[#1A2B4C] text-white rounded-lg hover:bg-[#1A2B4C]/90 whitespace-nowrap"
          >
            Tháng này
          </button>
          <button
            onClick={handleLastMonth}
            className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 whitespace-nowrap"
          >
            Tháng trước
          </button>
        </div>
      </div>
    </div>
  );
}
