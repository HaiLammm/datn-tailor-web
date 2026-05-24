/**
 * ShowroomFilter Component Tests - Story 2.3
 *
 * Tests select-based filter UI with 5 dimensions.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { ShowroomFilter } from "@/components/client/showroom/ShowroomFilter";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

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

  it("should render material options in select dropdown", () => {
    render(<ShowroomFilter />);

    expect(screen.getByText("Lụa")).toBeInTheDocument();
    expect(screen.getByText("Gấm")).toBeInTheDocument();
    expect(screen.getByText("Nhung")).toBeInTheDocument();
    expect(screen.getByText("Voan")).toBeInTheDocument();
    expect(screen.getByText("Satin")).toBeInTheDocument();
    expect(screen.getByText("Cotton")).toBeInTheDocument();
    expect(screen.getByText("Pha")).toBeInTheDocument();
  });

  it("should render size options in select dropdown", () => {
    render(<ShowroomFilter />);

    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(screen.getByText("XL")).toBeInTheDocument();
    expect(screen.getByText("XXL")).toBeInTheDocument();
  });

  it("should render occasion options in select dropdown", () => {
    render(<ShowroomFilter />);

    expect(screen.getByText("Lễ Cưới")).toBeInTheDocument();
    expect(screen.getByText("Tết")).toBeInTheDocument();
    expect(screen.getByText("Công Sở")).toBeInTheDocument();
  });

  it("should toggle filter and update URL on select change", () => {
    render(<ShowroomFilter />);

    const materialSelect = screen.getByLabelText("Lọc theo Chất liệu");
    fireEvent.change(materialSelect, { target: { value: "lua" } });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("material=lua"),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("page=1"),
    );
  });

  it("should clear filter when selecting empty option", () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "material") return "lua";
      return null;
    });
    mockSearchParams.toString.mockReturnValue("material=lua");

    render(<ShowroomFilter />);

    const materialSelect = screen.getByLabelText("Lọc theo Chất liệu");
    fireEvent.change(materialSelect, { target: { value: "" } });

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

  it("should have correct ARIA role and labels", () => {
    render(<ShowroomFilter />);

    const filterContainer = screen.getByRole("search");
    expect(filterContainer).toHaveAttribute("aria-label", "Bộ lọc sản phẩm");

    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBe(5);
    selects.forEach((sel) => {
      expect(sel).toHaveAttribute("aria-label");
    });
  });

  it("should handle multi-filter URL correctly", () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "material") return "lua";
      return null;
    });
    mockSearchParams.toString.mockReturnValue("material=lua");

    render(<ShowroomFilter />);

    const occasionSelect = screen.getByLabelText("Lọc theo Dịp");
    fireEvent.change(occasionSelect, { target: { value: "tet" } });

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

    const sizeSelect = screen.getByLabelText("Lọc theo Kích cỡ");
    fireEvent.change(sizeSelect, { target: { value: "S" } });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("page=1"),
    );
  });
});
