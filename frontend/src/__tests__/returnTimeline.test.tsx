/**
 * ReturnTimeline Component Tests - Story 5.2: Return Timeline & Status
 *
 * Tests all 4 status display scenarios:
 * - Available: "Sẵn sàng cho thuê"
 * - Maintenance: "Đang bảo trì"
 * - Rented + future return: "Đang được thuê" with days count
 * - Rented + overdue: "Quá hạn trả" with overdue days
 * - Rented + due today: "Trả hàng hôm nay"
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { ReturnTimeline } from "@/components/client/showroom/ReturnTimeline";
import type { Garment } from "@/types/garment";

const baseGarment: Garment = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  tenant_id: "00000000-0000-0000-0000-000000000001",
  name: "Áo dài truyền thống",
  description: null,
  category: "ao_dai_truyen_thong",
  color: null,
  occasion: null,
  size_options: ["M"],
  rental_price: "500000",
  image_url: null,
  status: "available",
  expected_return_date: null,
  days_until_available: null,
  is_overdue: false,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

describe("ReturnTimeline (Story 5.2)", () => {
  describe("Available status", () => {
    it("should display 'Sẵn sàng cho thuê' for available garment", () => {
      render(<ReturnTimeline garment={baseGarment} />);
      expect(screen.getByText("Sẵn sàng cho thuê")).toBeInTheDocument();
    });

    it("should have accessible aria-label for available status", () => {
      render(<ReturnTimeline garment={baseGarment} />);
      expect(
        screen.getByLabelText("Trạng thái: Sẵn sàng cho thuê")
      ).toBeInTheDocument();
    });
  });

  describe("Maintenance status", () => {
    it("should display 'Đang bảo trì' for maintenance garment", () => {
      const maintenanceGarment: Garment = {
        ...baseGarment,
        status: "maintenance",
      };
      render(<ReturnTimeline garment={maintenanceGarment} />);
      expect(screen.getByText("Đang bảo trì")).toBeInTheDocument();
    });

    it("should have accessible aria-label for maintenance status", () => {
      const maintenanceGarment: Garment = {
        ...baseGarment,
        status: "maintenance",
      };
      render(<ReturnTimeline garment={maintenanceGarment} />);
      expect(
        screen.getByLabelText("Trạng thái: Đang bảo trì")
      ).toBeInTheDocument();
    });
  });

  describe("Rented — future return", () => {
    it("should display 'Đang được thuê' with days count", () => {
      const rentedGarment: Garment = {
        ...baseGarment,
        status: "rented",
        expected_return_date: "2026-03-20",
        days_until_available: 11,
        is_overdue: false,
      };
      render(<ReturnTimeline garment={rentedGarment} />);
      expect(screen.getByText("Đang được thuê")).toBeInTheDocument();
      expect(screen.getByText("Còn 11 ngày sẵn sàng")).toBeInTheDocument();
    });

    it("should display formatted expected return date", () => {
      const rentedGarment: Garment = {
        ...baseGarment,
        status: "rented",
        expected_return_date: "2026-03-20",
        days_until_available: 11,
        is_overdue: false,
      };
      render(<ReturnTimeline garment={rentedGarment} />);
      expect(screen.getByText(/Dự kiến trả:/)).toBeInTheDocument();
    });
  });

  describe("Rented — overdue", () => {
    it("should display 'Quá hạn trả' with overdue days", () => {
      const overdueGarment: Garment = {
        ...baseGarment,
        status: "rented",
        expected_return_date: "2026-03-01",
        days_until_available: -8,
        is_overdue: true,
      };
      render(<ReturnTimeline garment={overdueGarment} />);
      expect(screen.getByText("Quá hạn trả")).toBeInTheDocument();
      expect(screen.getByText("Đã quá hạn 8 ngày")).toBeInTheDocument();
    });

    it("should have correct aria-label for overdue status", () => {
      const overdueGarment: Garment = {
        ...baseGarment,
        status: "rented",
        expected_return_date: "2026-03-01",
        days_until_available: -8,
        is_overdue: true,
      };
      render(<ReturnTimeline garment={overdueGarment} />);
      expect(
        screen.getByLabelText("Trạng thái: Quá hạn 8 ngày")
      ).toBeInTheDocument();
    });
  });

  describe("Rented — due today", () => {
    it("should display 'Trả hàng hôm nay' when days_until_available is 0", () => {
      const todayGarment: Garment = {
        ...baseGarment,
        status: "rented",
        expected_return_date: "2026-03-09",
        days_until_available: 0,
        is_overdue: false,
      };
      render(<ReturnTimeline garment={todayGarment} />);
      expect(screen.getByText("Trả hàng hôm nay")).toBeInTheDocument();
    });

    it("should have correct aria-label for due today", () => {
      const todayGarment: Garment = {
        ...baseGarment,
        status: "rented",
        expected_return_date: "2026-03-09",
        days_until_available: 0,
        is_overdue: false,
      };
      render(<ReturnTimeline garment={todayGarment} />);
      expect(
        screen.getByLabelText("Trạng thái: Trả hàng hôm nay")
      ).toBeInTheDocument();
    });
  });

  describe("Unknown status", () => {
    it("should render nothing for unknown status", () => {
      const unknownGarment: Garment = {
        ...baseGarment,
        status: "unknown",
      };
      const { container } = render(<ReturnTimeline garment={unknownGarment} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
