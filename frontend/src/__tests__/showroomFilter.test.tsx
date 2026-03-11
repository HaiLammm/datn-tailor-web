/**
 * ShowroomFilter Component Tests - Story 2.3
 *
 * Tests:
 * - Filter chip groups render correctly for all 5 dimensions
 * - Chip toggle updates URL params
 * - Multi-select (AND logic) via URL params
 * - Clear filters works
 * - Active filter summary with remove buttons
 * - Keyboard navigation (Tab + Enter/Space)
 * - ARIA labels and roles
 * - Minimum touch targets (44px)
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchGarmentColors } from "@/app/actions/garment-actions";

import { ShowroomFilter } from "@/components/client/showroom/ShowroomFilter";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock TanStack Query
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

// Mock server actions
jest.mock("@/app/actions/garment-actions", () => ({
  fetchGarmentColors: jest.fn(),
}));

describe("ShowroomFilter (Story 2.3)", () => {
  const mockPush = jest.fn();
  const mockGet = jest.fn().mockReturnValue(null);
  const mockSearchParams = {
    get: mockGet,
    toString: jest.fn().mockReturnValue(""),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue(null);
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    
    // Default mock for dynamic colors (Review Follow-up MEDIUM)
    (useQuery as jest.Mock).mockReturnValue({
      data: ["Đỏ", "Xanh"],
      isLoading: false,
    });
  });

  it("should render all 5 filter dimension labels", () => {
    render(<ShowroomFilter />);

    expect(screen.getByText("Dịp")).toBeInTheDocument();
    expect(screen.getByText("Chất liệu")).toBeInTheDocument();
    expect(screen.getByText("Màu sắc")).toBeInTheDocument();
    expect(screen.getByText("Kích cỡ")).toBeInTheDocument();
    expect(screen.getByText("Loại")).toBeInTheDocument();
  });

  it("should render material chip options", () => {
    render(<ShowroomFilter />);

    expect(screen.getByText("Lụa")).toBeInTheDocument();
    expect(screen.getByText("Gấm")).toBeInTheDocument();
    expect(screen.getByText("Nhung")).toBeInTheDocument();
    expect(screen.getByText("Voan")).toBeInTheDocument();
    expect(screen.getByText("Satin")).toBeInTheDocument();
    expect(screen.getByText("Cotton")).toBeInTheDocument();
    expect(screen.getByText("Pha")).toBeInTheDocument();
  });

  it("should render size chip options", () => {
    render(<ShowroomFilter />);

    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(screen.getByText("XL")).toBeInTheDocument();
    expect(screen.getByText("XXL")).toBeInTheDocument();
  });

  it("should render occasion chip options", () => {
    render(<ShowroomFilter />);

    expect(screen.getByText("Lễ Cưới")).toBeInTheDocument();
    expect(screen.getByText("Tết")).toBeInTheDocument();
    expect(screen.getByText("Công Sở")).toBeInTheDocument();
  });

  it("should toggle chip and update URL on click", () => {
    render(<ShowroomFilter />);

    const luaChip = screen.getByText("Lụa");
    fireEvent.click(luaChip);

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("material=lua"),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("page=1"),
    );
  });

  it("should deselect chip when clicking active chip", () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "material") return "lua";
      return null;
    });
    mockSearchParams.toString.mockReturnValue("material=lua");

    render(<ShowroomFilter />);

    // Get the chip checkbox (not the summary remove button)
    const luaChip = screen.getByRole("checkbox", { name: "Chất liệu: Lụa" });
    fireEvent.click(luaChip);

    // Should remove material from URL
    expect(mockPush).toHaveBeenCalled();
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).not.toContain("material=lua");
  });

  it("should show active filter summary when filters are active", () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "material") return "lua";
      return null;
    });
    mockSearchParams.toString.mockReturnValue("material=lua");

    render(<ShowroomFilter />);

    expect(screen.getByText("Đang lọc:")).toBeInTheDocument();
    expect(screen.getByText("Xoá bộ lọc")).toBeInTheDocument();
  });

  it("should not show active filter summary when no filters active", () => {
    render(<ShowroomFilter />);

    expect(screen.queryByText("Đang lọc:")).not.toBeInTheDocument();
  });

  it("should clear all filters when clicking clear button", () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "material") return "lua";
      if (key === "color") return "Đỏ";
      return null;
    });
    mockSearchParams.toString.mockReturnValue("material=lua&color=%C4%90%E1%BB%8F");

    render(<ShowroomFilter />);

    const clearButton = screen.getByText("Xoá bộ lọc");
    fireEvent.click(clearButton);

    expect(mockPush).toHaveBeenCalledWith("/showroom");
  });

  it("should have correct ARIA roles and labels", () => {
    render(<ShowroomFilter />);

    const filterContainer = screen.getByRole("search");
    expect(filterContainer).toHaveAttribute("aria-label", "Bộ lọc sản phẩm");

    const chipGroups = screen.getAllByRole("group");
    expect(chipGroups.length).toBe(5);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
    checkboxes.forEach((cb) => {
      expect(cb).toHaveAttribute("aria-label");
    });
  });

  it("should mark active chip with aria-checked=true", () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "size") return "M";
      return null;
    });
    mockSearchParams.toString.mockReturnValue("size=M");

    render(<ShowroomFilter />);

    const checkboxes = screen.getAllByRole("checkbox");
    const mChip = checkboxes.find((cb) => cb.textContent === "M");
    expect(mChip).toHaveAttribute("aria-checked", "true");
  });

  it("should have min 44px touch targets on chips", () => {
    render(<ShowroomFilter />);

    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((chip) => {
      expect(chip.className).toContain("min-h-[44px]");
      expect(chip.className).toContain("min-w-[44px]");
    });
  });

  it("should support keyboard navigation with Enter", () => {
    render(<ShowroomFilter />);

    const luaChip = screen.getByRole("checkbox", { name: "Chất liệu: Lụa" });
    fireEvent.keyDown(luaChip, { key: "Enter" });
    
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("material=lua"),
    );
  });

  it("should support keyboard navigation with Space", () => {
    render(<ShowroomFilter />);

    const sChip = screen.getByRole("checkbox", { name: "Kích cỡ: S" });
    fireEvent.keyDown(sChip, { key: " " });
    
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("size=S"),
    );
  });

  it("should handle multi-filter URL correctly", () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "material") return "lua";
      return null;
    });
    mockSearchParams.toString.mockReturnValue("material=lua");

    render(<ShowroomFilter />);

    const tetChip = screen.getByText("Tết");
    fireEvent.click(tetChip);

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("material=lua"),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("occasion=tet"),
    );
  });

  it("should reset to page 1 when filter changes", () => {
    mockGet.mockReturnValue(null);
    mockSearchParams.toString.mockReturnValue("page=3");

    render(<ShowroomFilter />);

    const sChip = screen.getByText("S");
    fireEvent.click(sChip);

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("page=1"),
    );
  });
});
