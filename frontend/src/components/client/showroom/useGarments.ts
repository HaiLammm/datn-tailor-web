"use client";

/**
 * Story 2.3: Custom hook for fetching garments with TanStack Query
 * Bridges server-side initial fetch with client-side re-fetching on filter change.
 */

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo, useRef } from "react";
import { fetchGarments } from "@/app/actions/garment-actions";
import { isValidEnum } from "@/utils/enum-utils";
import {
  GarmentFilter,
  GarmentListResponse,
  GarmentMaterial,
  GarmentOccasion,
  GarmentCategory,
  GarmentStatus,
} from "@/types/garment";

export function useGarments(initialData?: GarmentListResponse) {
  const searchParams = useSearchParams();
  const isFirstMount = useRef(true);

  // Derive current filters from URL search params
  const currentFilters = useMemo((): GarmentFilter => {
    const occasionParam = searchParams.get("occasion");
    const materialParam = searchParams.get("material");
    const categoryParam = searchParams.get("category");
    const statusParam = searchParams.get("status");

    return {
      color: searchParams.get("color") || undefined,
      occasion: isValidEnum(occasionParam, GarmentOccasion) ? occasionParam as GarmentOccasion : undefined,
      material: isValidEnum(materialParam, GarmentMaterial) ? materialParam as GarmentMaterial : undefined,
      category: isValidEnum(categoryParam, GarmentCategory) ? categoryParam as GarmentCategory : undefined,
      status: isValidEnum(statusParam, GarmentStatus) ? statusParam as GarmentStatus : undefined,
      size: searchParams.get("size") || undefined,
      page: Number(searchParams.get("page")) || 1,
      page_size: Number(searchParams.get("page_size")) || 20,
    };
  }, [searchParams]);

  // Debounce filters to prevent excessive API calls during rapid filter changes (Task 5.5)
  const [debouncedFilters, setDebouncedFilters] = useState<GarmentFilter>(currentFilters);

  useEffect(() => {
    // If it's the first mount, immediately sync to prevent empty state flash (Review Follow-up HIGH)
    if (isFirstMount.current) {
      setDebouncedFilters(currentFilters);
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedFilters(currentFilters);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentFilters]);

  const queryKey = ["garments", debouncedFilters] as const;

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      // Use server action instead of direct fetch (Proxy Pattern compliance - Review Follow-up HIGH)
      const response = await fetchGarments(debouncedFilters);
      if (!response) throw new Error("Failed to fetch garments");
      return response.data;
    },
    // Use initialData from SSR on the first load of this query key
    initialData: initialData,
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    garments: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    pageSize: query.data?.page_size ?? 20,
    totalPages: query.data?.total_pages ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    // Add current filters (non-debounced) for immediate UI feedback if needed
    activeFilters: currentFilters,
  };
}
