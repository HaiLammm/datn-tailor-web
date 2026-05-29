/**
 * TestimonialStrip Component Tests — Story 15.3.
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { TestimonialStrip, type TestimonialItem } from "@/components/client/brand/TestimonialStrip";

// Disable auto-advance for deterministic tests (no interval).
jest.mock("framer-motion", () => ({ useReducedMotion: () => true }));

const items: TestimonialItem[] = [
  { quote: "Tà áo như được sinh ra cho riêng mình.", name: "Chị Phương", context: "Khách may áo riêng", avatarInitial: "P" },
  { quote: "Người thợ tận tâm, chỉn chu.", name: "Chị Trang", context: "Áo dài cưới", avatarInitial: "T" },
  { quote: "Hiện đại mà vẫn ấm cái tình xưa.", name: "Chị Ngọc", context: "Áo dài Tết", avatarInitial: "N" },
];

describe("TestimonialStrip", () => {
  it("renders the heading and all quotes (desktop grid)", () => {
    render(<TestimonialStrip heading="Khách thương" items={items} />);
    expect(screen.getByRole("heading", { name: "Khách thương" })).toBeInTheDocument();
    // Each quote appears in the desktop grid (mobile carousel may duplicate the active one).
    items.forEach((t) => {
      expect(screen.getAllByText(`“${t.quote}”`).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("exposes accessible prev/next carousel controls", () => {
    render(<TestimonialStrip items={items} />);
    expect(screen.getByRole("button", { name: "Đánh giá trước" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đánh giá sau" })).toBeInTheDocument();
  });

  it("advances the active dot when next is clicked", () => {
    render(<TestimonialStrip items={items} />);
    const dot1 = screen.getByRole("button", { name: "Xem đánh giá 1" });
    const dot2 = screen.getByRole("button", { name: "Xem đánh giá 2" });
    expect(dot1).toHaveAttribute("aria-current", "true");
    expect(dot2).not.toHaveAttribute("aria-current");

    fireEvent.click(screen.getByRole("button", { name: "Đánh giá sau" }));
    expect(dot2).toHaveAttribute("aria-current", "true");
    expect(dot1).not.toHaveAttribute("aria-current");
  });

  it("wraps to the last item when prev is clicked from the first", () => {
    render(<TestimonialStrip items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "Đánh giá trước" }));
    expect(screen.getByRole("button", { name: "Xem đánh giá 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  it("renders nothing (no crash) when items is empty", () => {
    const { container } = render(<TestimonialStrip items={[]} heading="Khách thương" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the lone item without carousel controls for a single testimonial", () => {
    render(<TestimonialStrip items={[items[0]]} />);
    expect(screen.queryByRole("button", { name: "Đánh giá sau" })).not.toBeInTheDocument();
    expect(screen.getAllByText(`“${items[0].quote}”`).length).toBeGreaterThanOrEqual(1);
  });
});
