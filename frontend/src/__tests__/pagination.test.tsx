/**
 * Pagination Component Tests - Story 2.3
 *
 * Tests:
 * - Renders page numbers, prev/next buttons
 * - Page change updates URL params
 * - Prev/Next disabled at boundaries
 * - Current page highlighted
 * - Ellipsis for many pages
 * - Keyboard accessible, 44px touch targets
 * - Hides when totalPages <= 1
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useRouter, useSearchParams } from "next/navigation";

import { Pagination } from "@/components/client/showroom/Pagination";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("Pagination (Story 2.3)", () => {
  const mockPush = jest.fn();
  const mockSearchParams = {
    get: jest.fn().mockReturnValue(null),
    toString: jest.fn().mockReturnValue(""),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  it("should render page numbers and navigation buttons", () => {
    render(<Pagination currentPage={1} totalPages={5} total={100} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByLabelText("Trang trước")).toBeInTheDocument();
    expect(screen.getByLabelText("Trang tiếp")).toBeInTheDocument();
  });

  it("should show total count", () => {
    render(<Pagination currentPage={1} totalPages={5} total={100} />);

    expect(screen.getByText("Trang 1 / 5 (100 sản phẩm)")).toBeInTheDocument();
  });

  it("should disable prev button on first page", () => {
    render(<Pagination currentPage={1} totalPages={5} total={100} />);

    const prevButton = screen.getByLabelText("Trang trước");
    expect(prevButton).toBeDisabled();
  });

  it("should disable next button on last page", () => {
    render(<Pagination currentPage={5} totalPages={5} total={100} />);

    const nextButton = screen.getByLabelText("Trang tiếp");
    expect(nextButton).toBeDisabled();
  });

  it("should highlight current page", () => {
    render(<Pagination currentPage={3} totalPages={5} total={100} />);

    const currentPageBtn = screen.getByLabelText("Trang 3");
    expect(currentPageBtn).toHaveAttribute("aria-current", "page");
    expect(currentPageBtn.className).toContain("bg-[#1A2B4C]");
  });

  it("should navigate to next page on click", () => {
    render(<Pagination currentPage={2} totalPages={5} total={100} />);

    const nextButton = screen.getByLabelText("Trang tiếp");
    fireEvent.click(nextButton);

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("page=3"),
    );
  });

  it("should navigate to specific page on click", () => {
    render(<Pagination currentPage={1} totalPages={5} total={100} />);

    const page4 = screen.getByLabelText("Trang 4");
    fireEvent.click(page4);

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("page=4"),
    );
  });

  it("should preserve existing URL params when changing page", () => {
    mockSearchParams.toString.mockReturnValue("material=lua&color=%C4%90%E1%BB%8F");

    render(<Pagination currentPage={1} totalPages={5} total={100} />);

    const page2 = screen.getByLabelText("Trang 2");
    fireEvent.click(page2);

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).toContain("material=lua");
    expect(pushedUrl).toContain("page=2");
  });

  it("should return null when totalPages <= 1", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} total={10} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should show ellipsis for many pages", () => {
    render(<Pagination currentPage={5} totalPages={20} total={400} />);

    const ellipses = screen.getAllByText("...");
    expect(ellipses.length).toBeGreaterThan(0);
  });

  it("should have proper navigation role and aria-label", () => {
    render(<Pagination currentPage={1} totalPages={5} total={100} />);

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveAttribute("aria-label", "Phân trang sản phẩm");
  });

  it("should have 44px touch targets on all buttons", () => {
    render(<Pagination currentPage={2} totalPages={5} total={100} />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn.className).toContain("min-h-[44px]");
      expect(btn.className).toContain("min-w-[44px]");
    });
  });
});
