// Mock dependencies at the top before any imports
jest.mock("@/app/actions/garment-actions", () => ({
  fetchGarments: jest.fn(),
}));
jest.mock("next/navigation");

import { renderHook, waitFor, act } from "@testing-library/react";
import { useGarments } from "../components/client/showroom/useGarments";
import { fetchGarments } from "@/app/actions/garment-actions";
import { useSearchParams } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { GarmentListResponse } from "@/types/garment";

const mockGarmentsData: GarmentListResponse = {
  items: [
    {
      id: "1",
      tenant_id: "tenant-1",
      name: "Test Garment",
      description: "Test Description",
      category: "ao_dai_truyen_thong",
      color: "Red",
      occasion: "tet",
      material: "lua",
      size_options: ["S", "M"],
      rental_price: "500000",
      sale_price: "2000000",
      image_url: "http://example.com/image.jpg",
      image_urls: [],
      status: "available",
      expected_return_date: null,
      days_until_available: null,
      is_overdue: false,
      renter_id: null,
      renter_name: null,
      renter_email: null,
      reminder_sent_at: null,
      reminder_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

describe("useGarments Hook (Story 2.3 - AI-Review HIGH)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });

    (fetchGarments as jest.Mock).mockResolvedValue({
      data: mockGarmentsData,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should fetch garments with default filters", async () => {
    const { result } = renderHook(() => useGarments(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchGarments).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        page_size: 20,
      })
    );
    expect(result.current.garments).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it("should use initialData if provided and filters are default", async () => {
    const { result } = renderHook(() => useGarments(mockGarmentsData), { wrapper });

    expect(result.current.garments).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
    // Should not fetch immediately if initialData is provided
    expect(fetchGarments).not.toHaveBeenCalled();
  });

  it("should sync filters immediately on first mount (Review Follow-up HIGH)", async () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockImplementation((key) => {
        if (key === "material") return "lua";
        return null;
      }),
    });

    const { result } = renderHook(() => useGarments(), { wrapper });

    // Should trigger fetch immediately for material=lua without 300ms delay on mount
    await waitFor(() => expect(fetchGarments).toHaveBeenCalledWith(
      expect.objectContaining({ material: "lua" })
    ));
  });

  it("should handle error state", async () => {
    (fetchGarments as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useGarments(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.garments).toHaveLength(0);
  });

  it("should debounce rapid filter changes (Task 5.5)", async () => {
    // Return a new searchParams object each time to trigger useMemo/useEffect
    (useSearchParams as jest.Mock)
      .mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) }) // Initial
      .mockReturnValue({ 
        get: jest.fn().mockImplementation((key) => {
          if (key === "color") return "Blue";
          return null;
        }) 
      }); // After rerender

    const { rerender } = renderHook(() => useGarments(), { wrapper });

    // Initial sync on mount
    await waitFor(() => expect(fetchGarments).toHaveBeenCalledTimes(1));

    rerender();

    // Should NOT have called fetchGarments immediately due to debounce
    expect(fetchGarments).toHaveBeenCalledTimes(1);

    // Wait for debounce period (300ms) + some buffer
    await new Promise((r) => setTimeout(r, 500));

    // Now it should have been called
    await waitFor(() => expect(fetchGarments).toHaveBeenCalledTimes(2));
    
    expect(fetchGarments).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: "Blue" })
    );
  });
});
