/**
 * Pattern Session Hooks - TanStack Query
 * Story 11.4: Profile-Driven Measurement Form UI
 *
 * Custom hooks for pattern session operations:
 * - useCreatePatternSession: Mutation for creating sessions (AC #7)
 * - useCustomerMeasurement: Query for fetching customer measurements (AC #2)
 * - useCustomerSearch: Query for customer search (AC #1)
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import {
  createPatternSession,
  fetchCustomerMeasurement,
  searchCustomers,
} from "@/app/actions/pattern-actions";
import type {
  PatternSessionCreate,
  PatternSessionResponse,
  PatternSessionListItem,
} from "@/types/pattern";
import type { MeasurementResponse } from "@/types/customer";

// ===== Create Pattern Session Mutation (AC #7) =====

interface UseCreatePatternSessionOptions {
  onSuccess?: (data: PatternSessionResponse) => void;
  onError?: (error: string) => void;
}

export function useCreatePatternSession(options?: UseCreatePatternSessionOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PatternSessionCreate) => {
      const result = await createPatternSession(data);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Không thể tạo phiên thiết kế");
      }
      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate any pattern session queries
      queryClient.invalidateQueries({ queryKey: ["pattern-sessions"] });

      // Navigate to session detail page (Story 11.5)
      router.push(`/design-session/${data.id}`);

      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error.message);
    },
  });
}

// ===== Customer Measurement Query (AC #2, #3) =====

interface UseCustomerMeasurementResult {
  measurement: MeasurementResponse | null;
  isLoading: boolean;
  error: string | null;
  hasMeasurement: boolean;
}

export function useCustomerMeasurement(
  customerId: string | null
): UseCustomerMeasurementResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["customer-measurement", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const result = await fetchCustomerMeasurement(customerId);
      if (!result.success) {
        throw new Error(result.error || "Không thể tải số đo");
      }
      return result.data;
    },
    enabled: !!customerId,
    staleTime: 30000, // 30 seconds
  });

  return {
    measurement: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    hasMeasurement: !!data,
  };
}

// ===== Customer Search Hook (AC #1) =====

interface CustomerSearchResult {
  id: string;
  full_name: string;
  phone: string;
}

interface UseCustomerSearchResult {
  results: CustomerSearchResult[];
  isSearching: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

export function useCustomerSearch(): UseCustomerSearchResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounced search (300ms as per AC #1)
  const search = useCallback((query: string) => {
    setSearchQuery(query);
    
    // Only search with 2+ characters (AC #1)
    if (query.length >= 2) {
      const timer = setTimeout(() => {
        setDebouncedQuery(query);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDebouncedQuery("");
    }
  }, []);

  const clear = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["customer-search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const result = await searchCustomers(debouncedQuery);
      if (!result.success) {
        throw new Error(result.error || "Không thể tìm kiếm");
      }
      return result.data || [];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 10000, // 10 seconds
  });

  return {
    results: data || [],
    isSearching: isLoading && searchQuery.length >= 2,
    error: error instanceof Error ? error.message : null,
    search,
    clear,
  };
}

// ===== Pattern Session Detail Query (Story 11.5) =====

export function usePatternSession(
  sessionId: string,
  options?: { initialData?: PatternSessionResponse }
) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["pattern-session", sessionId],
    queryFn: async () => {
      // TODO: implement fetchPatternSession action
      throw new Error("Not implemented");
    },
    initialData: options?.initialData,
    enabled: !!sessionId,
  });

  return {
    session: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

// ===== Generate Pattern Mutation (Story 11.5) =====

export function useGeneratePattern(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // TODO: implement generatePattern action
      throw new Error("Not implemented");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pattern-session", sessionId] });
    },
  });
}

// ===== Attach Pattern to Order (Story 11.6) =====

export function useAttachPattern(options?: {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}) {
  return useMutation({
    mutationFn: async (_payload: { orderId: string; patternSessionId: string }) => {
      // TODO: implement attachPattern action
      throw new Error("Not implemented");
    },
    onSuccess: () => options?.onSuccess?.(),
    onError: (error: Error) => options?.onError?.(error.message),
  });
}

// ===== Customer Pattern Sessions Query (Story 11.6) =====

export function useCustomerPatternSessions(customerId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["customer-pattern-sessions", customerId],
    queryFn: async (): Promise<PatternSessionListItem[]> => {
      // TODO: implement fetchCustomerPatternSessions action
      return [];
    },
    enabled: !!customerId,
  });

  return {
    sessions: data ?? [],
    isLoading,
  };
}

// ===== Export Piece Mutation (Story 11.6) =====

export function useExportPiece() {
  return useMutation({
    mutationFn: async (_payload: {
      pieceId: string;
      format: string;
      speed?: number;
      power?: number;
    }) => {
      // TODO: implement exportPiece action
      throw new Error("Not implemented");
    },
  });
}

// ===== Export Session Mutation (Story 11.6) =====

export function useExportSession() {
  return useMutation({
    mutationFn: async (_payload: {
      sessionId: string;
      format: string;
      speed?: number;
      power?: number;
    }) => {
      // TODO: implement exportSession action
      throw new Error("Not implemented");
    },
  });
}
