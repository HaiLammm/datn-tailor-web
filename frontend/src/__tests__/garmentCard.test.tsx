/**
 * GarmentCard Component Tests - Story 5.1 & 5.2
 *
 * Tests:
 * - GarmentCard renders with correct data
 * - Image display (with and without image_url)
 * - Status badge renders correctly
 * - Price formatting
 * - Size options display
 * - Color and occasion tags
 * - Story 5.2: expected_return_date display
 * - Story 5.2: "Xem" navigates to detail page via Link
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { GarmentCard } from "@/components/client/showroom/GarmentCard";
import type { Garment } from "@/types/garment";

const mockGarment: Garment = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  tenant_id: "00000000-0000-0000-0000-000000000001",
  name: "Áo dài truyền thống đỏ",
  description: "Áo dài lụa đỏ sang trọng, phù hợp cho lễ cưới",
  category: "ao_dai_truyen_thong",
  color: "Đỏ",
  occasion: "le_cuoi",
  size_options: ["S", "M", "L"],
  rental_price: "500000",
  sale_price: null,
  image_url: "https://example.com/ao-dai-do.jpg",
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
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

describe("GarmentCard (Story 5.1 & 5.2)", () => {
  it("should render garment name", () => {
    render(<GarmentCard garment={mockGarment} />);
    expect(screen.getByText("Áo dài truyền thống đỏ")).toBeInTheDocument();
  });

  it("should render garment description", () => {
    render(<GarmentCard garment={mockGarment} />);
    expect(screen.getByText(/Áo dài lụa đỏ sang trọng/)).toBeInTheDocument();
  });

  it("should render price in VND format", () => {
    render(<GarmentCard garment={mockGarment} />);
    // Vietnamese currency format
    expect(screen.getByText(/500\.000/)).toBeInTheDocument();
  });

  it("should render all size options", () => {
    render(<GarmentCard garment={mockGarment} />);
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("should render color tag", () => {
    render(<GarmentCard garment={mockGarment} />);
    expect(screen.getByText("Đỏ")).toBeInTheDocument();
  });

  it("should render occasion tag", () => {
    render(<GarmentCard garment={mockGarment} />);
    expect(screen.getByText("le cuoi")).toBeInTheDocument(); // Underscore replaced with space
  });

  it("should render status badge", () => {
    render(<GarmentCard garment={mockGarment} />);
    expect(screen.getByText("Sẵn sàng")).toBeInTheDocument(); // Available status
  });

  it("should render placeholder when no image_url", () => {
    const garmentNoImage = { ...mockGarment, image_url: null };
    render(<GarmentCard garment={garmentNoImage} />);
    expect(screen.getByText("Chưa có hình ảnh")).toBeInTheDocument();
  });

  it("should render view link with correct href (Story 5.2)", () => {
    render(<GarmentCard garment={mockGarment} />);
    const link = screen.getByRole("link", { name: /Xem chi tiết/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      `/showroom/${mockGarment.id}`
    );
  });

  it("should have minimum touch target size on view link (Story 5.2)", () => {
    render(<GarmentCard garment={mockGarment} />);
    const link = screen.getByRole("link", { name: /Xem chi tiết/ });
    expect(link).toHaveClass("min-h-[44px]");
    expect(link).toHaveClass("min-w-[44px]");
  });

  it("should show expected_return_date when present (Story 5.2)", () => {
    const rentedGarment: Garment = {
      ...mockGarment,
      status: "rented",
      expected_return_date: "2026-03-15",
      days_until_available: 6,
      is_overdue: false,
    };
    render(<GarmentCard garment={rentedGarment} />);
    expect(screen.getByText(/Dự kiến trả/)).toBeInTheDocument();
    expect(screen.getByText(/15\/03\/2026/)).toBeInTheDocument();
  });

  it("should not show return date label when expected_return_date is null (Story 5.2)", () => {
    render(<GarmentCard garment={mockGarment} />);
    expect(screen.queryByText(/Dự kiến trả/)).not.toBeInTheDocument();
  });
});

