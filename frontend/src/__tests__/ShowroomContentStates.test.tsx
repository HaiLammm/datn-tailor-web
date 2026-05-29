/**
 * Story 15.2: ShowroomContent empty + loading states.
 * Drives useGarments to assert the refined empty-state copy and the
 * skeleton-grid loading state (instead of a spinner/text fallback).
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: () => null, toString: () => "" }),
}));

jest.mock("@/app/actions/profile-actions", () => ({
  getMyVouchers: jest.fn(async () => ({ success: false })),
}));

jest.mock("@/components/client/showroom/ShowroomFilter", () => ({
  ShowroomFilter: () => <div data-testid="showroom-filter" />,
}));
jest.mock("@/components/client/showroom/GarmentGrid", () => ({
  GarmentGrid: ({ garments }: { garments: unknown[] }) => (
    <div data-testid="garment-grid">{garments.length}</div>
  ),
}));
jest.mock("@/components/client/showroom/Pagination", () => ({
  Pagination: () => <div data-testid="pagination" />,
}));

const useGarmentsMock = jest.fn();
jest.mock("@/components/client/showroom/useGarments", () => ({
  useGarments: () => useGarmentsMock(),
}));

import { ShowroomContent } from "@/components/client/showroom/ShowroomContent";

const baseState = {
  garments: [],
  total: 0,
  page: 1,
  totalPages: 0,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  pushMock.mockClear();
});

describe("ShowroomContent states (Story 15.2)", () => {
  it("shows the purposeful empty state with AC copy when no products match", () => {
    useGarmentsMock.mockReturnValue({ ...baseState });
    render(<ShowroomContent />);

    expect(screen.getByText("Không tìm thấy áo dài phù hợp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xóa bộ lọc/ })).toBeInTheDocument();
  });

  it("renders the skeleton grid (not a spinner) while initially loading", () => {
    useGarmentsMock.mockReturnValue({ ...baseState, isLoading: true });
    render(<ShowroomContent />);

    expect(screen.getByTestId("garment-grid-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Không tìm thấy áo dài phù hợp")).not.toBeInTheDocument();
  });

  it("shows the skeleton (not a blank area) during an empty→empty re-fetch", () => {
    // placeholderData keeps the prior empty result: isFetching true, isLoading
    // false, no rows. Must render the skeleton, not collapse to nothing.
    useGarmentsMock.mockReturnValue({ ...baseState, isFetching: true });
    render(<ShowroomContent />);

    expect(screen.getByTestId("garment-grid-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Không tìm thấy áo dài phù hợp")).not.toBeInTheDocument();
  });
});
