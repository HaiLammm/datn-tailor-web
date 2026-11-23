/**
 * About Page smoke test — Story 15.3.
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import AboutPage from "@/app/(customer)/about/page";

jest.mock("framer-motion", () => ({ useReducedMotion: () => true }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("AboutPage", () => {
  it("renders the 4 pillar section headings in order", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: "Khởi đầu từ một điều giản dị." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "May một chiếc áo dài ở tiệm gồm những bước nào?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Điều khiến bạn muốn quay lại" })).toBeInTheDocument();
    // TESTIMONIALS_ENABLED=false → khối lời khách ẩn
    expect(
      screen.queryByRole("heading", { name: "Khách nói gì sau khi may áo ở tiệm?" })
    ).toBeNull();
  });

  it("renders the 5-step craft process timeline", () => {
    render(<AboutPage />);
    ["Tư vấn", "Đo", "Lên mẫu", "May tay", "Thử áo và nhận áo"].forEach((step) => {
      expect(screen.getByRole("heading", { name: step })).toBeInTheDocument();
    });
  });

  it("links the closing CTA to /booking and /contact", () => {
    render(<AboutPage />);
    expect(screen.getByRole("link", { name: "Đặt lịch tư vấn" })).toHaveAttribute("href", "/booking");
    expect(screen.getByRole("link", { name: "Liên hệ" })).toHaveAttribute("href", "/contact");
  });

  it("does not render a page-level footer (shared SiteFooter comes from the layout)", () => {
    const { container } = render(<AboutPage />);
    expect(container.querySelector("footer")).toBeNull();
  });
});
