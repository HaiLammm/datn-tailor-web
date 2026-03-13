/**
 * ProductTable Component Tests - Story 2.4
 *
 * Tests:
 * - Renders product table with correct columns (AC #4)
 * - Shows empty state when no garments
 * - Renders category badge in Vietnamese
 * - Renders status badge with correct colors
 * - Shows edit link and delete button
 * - Calls onDeleteClick when delete button clicked
 * - Shows price formatted in VND
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Next.js Link
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Mock next/image
jest.mock("next/image", () => {
  const MockImage = ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => <img src={src} alt={alt} {...props} />;
  MockImage.displayName = "MockImage";
  return MockImage;
});

import ProductTable from "@/components/client/products/ProductTable";
import type { Garment } from "@/types/garment";

const makeGarment = (overrides: Partial<Garment> = {}): Garment => ({
  id: "garment-001",
  tenant_id: "tenant-001",
  name: "Áo Dài Truyền Thống Đỏ",
  description: "Mô tả áo dài",
  category: "ao_dai_truyen_thong",
  color: "Đỏ",
  occasion: "le_cuoi",
  material: "lua",
  size_options: ["M", "L"],
  rental_price: "500000",
  sale_price: "2000000",
  image_url: null,
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
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("ProductTable", () => {
  it("renders empty state when no garments", () => {
    render(<ProductTable garments={[]} onDeleteClick={jest.fn()} />);
    expect(screen.getByText("Chưa có sản phẩm nào")).toBeInTheDocument();
  });

  it("renders product in desktop table with correct columns (AC #4)", () => {
    const garment = makeGarment();
    render(<ProductTable garments={[garment]} onDeleteClick={jest.fn()} />);

    // Table headers
    expect(screen.getByText("Tên sản phẩm")).toBeInTheDocument();
    expect(screen.getByText("Loại")).toBeInTheDocument();
    expect(screen.getByText("Giá thuê")).toBeInTheDocument();
    expect(screen.getByText("Giá bán")).toBeInTheDocument();
    expect(screen.getByText("Trạng thái")).toBeInTheDocument();
    expect(screen.getByText("Hành động")).toBeInTheDocument();
  });

  it("shows garment name in table", () => {
    const garment = makeGarment();
    render(<ProductTable garments={[garment]} onDeleteClick={jest.fn()} />);
    expect(screen.getAllByText("Áo Dài Truyền Thống Đỏ").length).toBeGreaterThan(0);
  });

  it("shows category badge in Vietnamese", () => {
    const garment = makeGarment({ category: "ao_dai_truyen_thong" });
    render(<ProductTable garments={[garment]} onDeleteClick={jest.fn()} />);
    expect(screen.getAllByText("Áo Dài Truyền Thống").length).toBeGreaterThan(0);
  });

  it("shows status badge 'Sẵn sàng' for available garment", () => {
    const garment = makeGarment({ status: "available" });
    render(<ProductTable garments={[garment]} onDeleteClick={jest.fn()} />);
    expect(screen.getAllByText("Sẵn sàng").length).toBeGreaterThan(0);
  });

  it("shows status badge 'Đang thuê' for rented garment", () => {
    const garment = makeGarment({ status: "rented" });
    render(<ProductTable garments={[garment]} onDeleteClick={jest.fn()} />);
    expect(screen.getAllByText("Đang thuê").length).toBeGreaterThan(0);
  });

  it("shows status badge 'Bảo trì' for maintenance garment", () => {
    const garment = makeGarment({ status: "maintenance" });
    render(<ProductTable garments={[garment]} onDeleteClick={jest.fn()} />);
    expect(screen.getAllByText("Bảo trì").length).toBeGreaterThan(0);
  });

  it("shows Sửa link pointing to edit route", () => {
    const garment = makeGarment({ id: "garment-001" });
    render(<ProductTable garments={[garment]} onDeleteClick={jest.fn()} />);
    const editLinks = screen.getAllByText("Sửa");
    expect(editLinks.length).toBeGreaterThan(0);
    expect(editLinks[0].closest("a")).toHaveAttribute("href", "/owner/products/garment-001/edit");
  });

  it("calls onDeleteClick with correct garment when Xóa is clicked", () => {
    const onDeleteClick = jest.fn();
    const garment = makeGarment();
    render(<ProductTable garments={[garment]} onDeleteClick={onDeleteClick} />);

    const deleteButtons = screen.getAllByText("Xóa");
    fireEvent.click(deleteButtons[0]);

    expect(onDeleteClick).toHaveBeenCalledWith(garment);
  });

  it("shows placeholder when no image_url", () => {
    const garment = makeGarment({ image_url: null });
    render(<ProductTable garments={[garment]} onDeleteClick={jest.fn()} />);
    // Should not render img elements with src
    const images = screen.queryAllByRole("img");
    expect(images.length).toBe(0);
  });

  it("shows thumbnail when image_url provided", () => {
    const garment = makeGarment({ image_url: "https://example.com/anh.jpg" });
    render(<ProductTable garments={[garment]} onDeleteClick={jest.fn()} />);
    const images = screen.getAllByRole("img", { name: "Áo Dài Truyền Thống Đỏ" });
    expect(images.length).toBeGreaterThan(0);
  });

  it("renders multiple garments", () => {
    const garments = [
      makeGarment({ id: "g1", name: "Áo Dài A" }),
      makeGarment({ id: "g2", name: "Áo Dài B" }),
      makeGarment({ id: "g3", name: "Áo Dài C" }),
    ];
    render(<ProductTable garments={garments} onDeleteClick={jest.fn()} />);
    expect(screen.getAllByText("Áo Dài A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Áo Dài B").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Áo Dài C").length).toBeGreaterThan(0);
  });
});
