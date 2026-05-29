import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { GarmentGridSkeleton } from "@/components/client/showroom/GarmentGridSkeleton";

describe("GarmentGridSkeleton (Story 15.2)", () => {
  it("renders the default number of card placeholders", () => {
    render(<GarmentGridSkeleton />);
    expect(screen.getAllByTestId("garment-card-skeleton")).toHaveLength(6);
  });

  it("respects a custom count", () => {
    render(<GarmentGridSkeleton count={3} />);
    expect(screen.getAllByTestId("garment-card-skeleton")).toHaveLength(3);
  });

  it("mirrors the GarmentGrid responsive layout and is announced as busy", () => {
    render(<GarmentGridSkeleton />);
    const grid = screen.getByTestId("garment-grid-skeleton");
    expect(grid).toHaveClass("grid", "grid-cols-1", "md:grid-cols-2", "lg:grid-cols-3");
    expect(grid).toHaveAttribute("aria-busy", "true");
  });
});
