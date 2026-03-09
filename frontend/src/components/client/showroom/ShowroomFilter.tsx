"use client";

/**
 * ShowroomFilter component - Story 5.1
 * Filter controls for color, occasion, status, category
 * Mobile: Bottom Sheet pattern for one-handed operation
 * Desktop: Horizontal filter bar
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GarmentOccasion, GarmentStatus, GarmentCategory } from "@/types/garment";

export function ShowroomFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const currentColor = searchParams.get("color") || "";
  const currentOccasion = searchParams.get("occasion") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentCategory = searchParams.get("category") || "";

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset to page 1 when filter changes
    params.set("page", "1");
    
    router.push(`/showroom?${params.toString()}`);
  };

  const handleClearFilters = () => {
    router.push("/showroom");
  };

  return (
    <>
      {/* Desktop Filter Bar (hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          {/* Occasion Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dịp
            </label>
            <select
              value={currentOccasion}
              onChange={(e) => handleFilterChange("occasion", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]"
            >
              <option value="">Tất cả</option>
              <option value={GarmentOccasion.LE_CUOI}>Lễ cưới</option>
              <option value={GarmentOccasion.KHAI_TRUONG}>Khai trương</option>
              <option value={GarmentOccasion.TET}>Tết</option>
              <option value={GarmentOccasion.CONG_SO}>Công sở</option>
              <option value={GarmentOccasion.TIEC_TUNG}>Tiệc tụng</option>
              <option value={GarmentOccasion.SINH_NHAT}>Sinh nhật</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>
            <select
              value={currentStatus}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]"
            >
              <option value="">Tất cả</option>
              <option value={GarmentStatus.AVAILABLE}>Sẵn sàng</option>
              <option value={GarmentStatus.RENTED}>Đang thuê</option>
              <option value={GarmentStatus.MAINTENANCE}>Bảo trì</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại
            </label>
            <select
              value={currentCategory}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]"
            >
              <option value="">Tất cả</option>
              <option value={GarmentCategory.AO_DAI_TRUYEN_THONG}>Truyền thống</option>
              <option value={GarmentCategory.AO_DAI_CACH_TAN}>Cách tân</option>
              <option value={GarmentCategory.AO_DAI_CUOI}>Cưới</option>
              <option value={GarmentCategory.AO_DAI_TE_NHI}>Tễ nhị</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 min-h-[44px]"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Filter Button (visible on mobile only) */}
      <div className="md:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full px-4 py-3 bg-[#1A2B4C] text-white rounded-lg flex items-center justify-center gap-2 min-h-[44px]"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Bộ lọc
        </button>
      </div>

      {/* Mobile Bottom Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          />

          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#1A2B4C]">Bộ lọc</h3>
            </div>

            {/* Filters */}
            <div className="p-4 space-y-4">
              {/* Occasion Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dịp
                </label>
                <select
                  value={currentOccasion}
                  onChange={(e) => handleFilterChange("occasion", e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-base min-h-[44px]"
                >
                  <option value="">Tất cả</option>
                  <option value={GarmentOccasion.LE_CUOI}>Lễ cưới</option>
                  <option value={GarmentOccasion.KHAI_TRUONG}>Khai trương</option>
                  <option value={GarmentOccasion.TET}>Tết</option>
                  <option value={GarmentOccasion.CONG_SO}>Công sở</option>
                  <option value={GarmentOccasion.TIEC_TUNG}>Tiệc tụng</option>
                  <option value={GarmentOccasion.SINH_NHAT}>Sinh nhật</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trạng thái
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-base min-h-[44px]"
                >
                  <option value="">Tất cả</option>
                  <option value={GarmentStatus.AVAILABLE}>Sẵn sàng</option>
                  <option value={GarmentStatus.RENTED}>Đang thuê</option>
                  <option value={GarmentStatus.MAINTENANCE}>Bảo trì</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại
                </label>
                <select
                  value={currentCategory}
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-base min-h-[44px]"
                >
                  <option value="">Tất cả</option>
                  <option value={GarmentCategory.AO_DAI_TRUYEN_THONG}>Truyền thống</option>
                  <option value={GarmentCategory.AO_DAI_CACH_TAN}>Cách tân</option>
                  <option value={GarmentCategory.AO_DAI_CUOI}>Cưới</option>
                  <option value={GarmentCategory.AO_DAI_TE_NHI}>Tễ nhị</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleClearFilters}
                className="flex-1 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
              >
                Xóa bộ lọc
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-3 bg-[#1A2B4C] text-white rounded-lg hover:bg-[#2A3B5C] min-h-[44px]"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
