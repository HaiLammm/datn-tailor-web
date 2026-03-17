"use client";

/**
 * Rental Board Client Component (Story 4.3)
 * Orchestrates TanStack Query for list + stats, URL filter state synchronization
 */

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  fetchRentalStats,
  fetchRentals,
} from "@/app/actions/rental-actions";
import type { RentalListParams } from "@/types/rental";
import { RentalFilters } from "./RentalFilters";
import { RentalStatsCards } from "./RentalStatsCards";
import { RentalTable } from "./RentalTable";

function RentalBoardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Parse URL params into filter state
  const params: RentalListParams = {
    status: (searchParams.get("status") as any) || undefined,
    search: searchParams.get("search") || undefined,
    sort_by: (searchParams.get("sort_by") as any) || "end_date",
    page: parseInt(searchParams.get("page") || "1"),
    page_size: parseInt(searchParams.get("page_size") || "20"),
  };

  // TanStack Query for rental list
  const {
    data: listData,
    isLoading: isListLoading,
    error: listError,
    refetch: refetchList,
  } = useQuery({
    queryKey: ["rentals", params],
    queryFn: async () => {
      const result = await fetchRentals(params);
      if (!result.success) throw new Error(result.error || "Failed to fetch rentals");
      return result.data;
    },
    staleTime: 60_000, // 1 minute
    enabled: true,
  });

  // TanStack Query for stats
  const {
    data: statsData,
    isLoading: isStatsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["rental-stats"],
    queryFn: async () => {
      const result = await fetchRentalStats();
      if (!result.success) throw new Error(result.error || "Failed to fetch stats");
      return result.data;
    },
    staleTime: 60_000,
    enabled: true,
  });

  // Handle filter change - update URL and trigger refetch
  const handleFilterChange = (newParams: Partial<RentalListParams>) => {
    setIsLoading(true);
    const queryParams = new URLSearchParams();

    const updatedParams = { ...params, ...newParams };
    if (updatedParams.status) queryParams.set("status", updatedParams.status);
    if (updatedParams.search) queryParams.set("search", updatedParams.search);
    queryParams.set("sort_by", updatedParams.sort_by || "end_date");
    queryParams.set("page", (updatedParams.page || 1).toString());
    queryParams.set("page_size", (updatedParams.page_size || 20).toString());

    router.push(`?${queryParams.toString()}`);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([refetchList(), refetchStats()]);
    setIsLoading(false);
  };

  // Error states
  if (listError || statsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p>Lỗi tải dữ liệu: {listError?.message || statsError?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <RentalStatsCards
        data={statsData}
        isLoading={isStatsLoading}
      />

      {/* Filters */}
      <RentalFilters
        params={params}
        onFilterChange={handleFilterChange}
        isLoading={isLoading || isListLoading}
      />

      {/* Table */}
      <RentalTable
        data={listData?.data || []}
        meta={listData?.meta}
        params={params}
        onFilterChange={handleFilterChange}
        isLoading={isLoading || isListLoading}
        onRefresh={handleRefresh}
      />
    </div>
  );
}

export function RentalBoardClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RentalBoardContent />
    </Suspense>
  );
}
