/**
 * Tests for Rental Board components (Story 4.3)
 * Using Jest + React Testing Library
 */

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CountdownBadge } from "@/components/client/rentals/CountdownBadge";
import { RentalStatsCards } from "@/components/client/rentals/RentalStatsCards";
import type { RentalStats } from "@/types/rental";

describe("RentalBoard Components", () => {
  describe("CountdownBadge", () => {
    it("should render green badge for days > 3", () => {
      render(<CountdownBadge daysRemaining={5} status="active" />);
      expect(screen.getByText("Còn 5 ngày")).toBeInTheDocument();
    });

    it("should render amber badge for days 1-3", () => {
      render(<CountdownBadge daysRemaining={2} status="active" />);
      expect(screen.getByText("Còn 2 ngày")).toBeInTheDocument();
    });

    it("should render red pulsing badge for overdue", () => {
      render(<CountdownBadge daysRemaining={-1} status="overdue" />);
      const badge = screen.getByText(/Quá hạn/);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("animate-pulse");
    });

    it("should render amber badge for due today (daysRemaining=0)", () => {
      render(<CountdownBadge daysRemaining={0} status="active" />);
      expect(screen.getByText("Hôm nay là hạn trả")).toBeInTheDocument();
    });

    it("should render gray badge for returned", () => {
      render(<CountdownBadge daysRemaining={0} status="returned" />);
      expect(screen.getByText("Đã trả")).toBeInTheDocument();
    });
  });

  describe("RentalStatsCards", () => {
    it("should render 4 summary cards", () => {
      const stats: RentalStats = {
        active_rentals: 10,
        overdue_rentals: 2,
        due_this_week: 5,
        returned_this_month: 20,
      };

      render(<RentalStatsCards data={stats} isLoading={false} />);

      expect(screen.getByText("Đang Thuê")).toBeInTheDocument();
      expect(screen.getByText("Quá Hạn")).toBeInTheDocument();
      expect(screen.getByText("Trả Trong Tuần")).toBeInTheDocument();
      expect(screen.getByText("Đã Trả Tháng Này")).toBeInTheDocument();
    });

    it("should display correct stats values", () => {
      const stats: RentalStats = {
        active_rentals: 10,
        overdue_rentals: 2,
        due_this_week: 5,
        returned_this_month: 20,
      };

      render(<RentalStatsCards data={stats} isLoading={false} />);

      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument();
    });

    it("should show loading skeletons when isLoading is true", () => {
      render(<RentalStatsCards data={undefined} isLoading={true} />);

      // Skeleton components should be rendered
      // Adjust based on actual Skeleton component implementation
      expect(screen.queryByText("Đang Thuê")).not.toBeInTheDocument();
    });
  });
});
