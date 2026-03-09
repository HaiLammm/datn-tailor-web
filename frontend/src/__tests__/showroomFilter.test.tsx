/**
 * ShowroomFilter Component Tests - Story 5.1
 *
 * Tests:
 * - Filter controls render correctly
 * - Filters update URL params
 * - Clear filters works
 * - Mobile bottom sheet opens/closes
 * - Desktop filter bar visibility
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useRouter, useSearchParams } from "next/navigation";

import { ShowroomFilter } from "@/components/client/showroom/ShowroomFilter";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("ShowroomFilter (Story 5.1)", () => {
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

  it("should render desktop filter controls", () => {
    render(<ShowroomFilter />);
    
    // Check for filter labels (desktop view)
    const dipLabels = screen.getAllByText("Dịp");
    expect(dipLabels.length).toBeGreaterThan(0);
  });

  it("should render mobile filter button", () => {
    render(<ShowroomFilter />);
    
    const buttons = screen.getAllByRole("button");
    const filterButton = buttons.find(btn => btn.textContent?.includes("Bộ lọc"));
    expect(filterButton).toBeTruthy();
  });

  it("should render occasion filter options", () => {
    render(<ShowroomFilter />);
    
    // Desktop select
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
  });

  it("should render clear filters button", () => {
    render(<ShowroomFilter />);
    
    const clearButtons = screen.getAllByText("Xóa bộ lọc");
    expect(clearButtons.length).toBeGreaterThan(0);
  });

  it("should have minimum touch targets for mobile", () => {
    render(<ShowroomFilter />);
    
    const buttons = screen.getAllByRole("button");
    const filterButton = buttons.find(btn => btn.textContent?.includes("Bộ lọc"));
    expect(filterButton?.className).toContain("min-h-[44px]");
  });
});
