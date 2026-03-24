"use client";

/**
 * ShowroomFilter component - Story 2.3: Multi-Dimensional Product Filter
 * Refactored from dropdown-based to tag-based filter chips UI
 * 5 filter dimensions: Dịp, Chất liệu, Màu sắc, Kích cỡ, Loại
 * Mobile: horizontal scrollable chip row per dimension
 * Desktop: horizontal chip bar with wrapping
 */

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchGarmentColors } from "@/app/actions/garment-actions";
import { GarmentCategory, GarmentMaterial, GarmentOccasion } from "@/types/garment";
import {
  CATEGORY_LABEL,
  MATERIAL_LABEL,
  OCCASION_LABEL,
  SIZE_OPTIONS,
} from "./garmentConstants";

interface FilterDimension {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export function ShowroomFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch unique colors dynamically (Review Follow-up MEDIUM)
  const { data: dynamicColors = [] } = useQuery({
    queryKey: ["garment-colors"],
    queryFn: async () => {
      const res = await fetchGarmentColors();
      return res.success ? (res.data as string[]) : [];
    },
    staleTime: 300_000,
  });

  const filterDimensions = useMemo((): FilterDimension[] => [
    {
      key: "occasion",
      label: "Dịp",
      options: Object.values(GarmentOccasion).map((v) => ({
        value: v,
        label: OCCASION_LABEL[v] || v,
      })),
    },
    {
      key: "material",
      label: "Chất liệu",
      options: Object.values(GarmentMaterial).map((v) => ({
        value: v,
        label: MATERIAL_LABEL[v] || v,
      })),
    },
    {
      key: "color",
      label: "Màu sắc",
      options: dynamicColors.map((c) => ({ value: c, label: c })),
    },
    {
      key: "size",
      label: "Kích cỡ",
      options: SIZE_OPTIONS.map((s) => ({ value: s, label: s })),
    },
    {
      key: "category",
      label: "Loại",
      options: Object.values(GarmentCategory).map((v) => ({
        value: v,
        label: CATEGORY_LABEL[v] || v,
      })),
    },
  ], [dynamicColors]);

  const activeFilters = useMemo(() => {
    const filters: Record<string, string> = {};
    for (const dim of filterDimensions) {
      const val = searchParams.get(dim.key);
      if (val) filters[dim.key] = val;
    }
    return filters;
  }, [searchParams, filterDimensions]);

  const activeFilterCount = Object.keys(activeFilters).length;

  const handleChipToggle = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (params.get(key) === value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }

      params.set("page", "1");
      router.push(`/showroom?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleClearFilters = useCallback(() => {
    router.push("/showroom");
  }, [router]);

  const handleRemoveFilter = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      params.set("page", "1");
      router.push(`/showroom?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="bg-white rounded-lg shadow p-4" role="search" aria-label="Bộ lọc sản phẩm">
      {/* Active filters summary */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <span className="text-sm text-gray-600">Đang lọc:</span>
          {Object.entries(activeFilters).map(([key, value]) => {
            const dim = filterDimensions.find((d) => d.key === key);
            const option = dim?.options.find((o) => o.value === value);
            return (
              <button
                key={key}
                onClick={() => handleRemoveFilter(key)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#1A2B4C] text-white min-h-[44px] hover:bg-[#2A3B5C] transition-colors"
                aria-label={`Xoá bộ lọc ${dim?.label}: ${option?.label || value}`}
              >
                {option?.label || value}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            );
          })}
          <button
            onClick={handleClearFilters}
            className="text-sm text-[#D4AF37] hover:underline min-h-[44px] px-2"
            aria-label="Xoá tất cả bộ lọc"
          >
            Xoá bộ lọc
          </button>
        </div>
      )}

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-3">
        {filterDimensions.map((dimension) => (
          <div key={dimension.key} className="flex flex-col">
            <label
              htmlFor={`filter-${dimension.key}`}
              className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
            >
              {dimension.label}
            </label>
            <select
              id={`filter-${dimension.key}`}
              value={activeFilters[dimension.key] || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  handleChipToggle(dimension.key, value);
                } else {
                  handleRemoveFilter(dimension.key);
                }
              }}
              className="min-h-[44px] px-3 py-2 rounded-lg border text-sm bg-[#F9F7F2] text-[#333]
                focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]
                transition-colors cursor-pointer"
              style={{
                fontFamily: "Inter, sans-serif",
                borderColor: activeFilters[dimension.key] ? "#D4AF37" : "#9E9E9E",
              }}
              aria-label={`Lọc theo ${dimension.label}`}
            >
              <option value="">Tất cả</option>
              {dimension.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Mobile filter count badge - shown only on small screens when filters active */}
      {activeFilterCount > 0 && (
        <div className="md:hidden fixed bottom-4 right-4 z-40">
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-2 px-4 py-3 bg-[#1A2B4C] text-white rounded-full shadow-lg min-h-[44px]"
            aria-label={`${activeFilterCount} bộ lọc đang áp dụng. Nhấn để xoá tất cả`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span className="bg-[#D4AF37] text-[#1A2B4C] rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {activeFilterCount}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
