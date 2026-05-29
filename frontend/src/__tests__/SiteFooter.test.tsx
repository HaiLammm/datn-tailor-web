/**
 * SiteFooter Component Tests — Story 15.1: Shared Boutique Mode footer.
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { SiteFooter } from "@/components/client/navigation/SiteFooter";

// Mock Next.js Link → plain anchor
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("SiteFooter", () => {
  it("renders the 3 column headings", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("heading", { name: "Về chúng tôi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Liên hệ" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Khám phá" })).toBeInTheDocument();
  });

  it("links Khám phá column to /showroom and /booking", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Showroom" })).toHaveAttribute("href", "/showroom");
    expect(screen.getByRole("link", { name: "Đặt lịch" })).toHaveAttribute("href", "/booking");
  });

  it("links Về chúng tôi column to /about", () => {
    render(<SiteFooter />);
    const aboutLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/about");
    expect(aboutLinks.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: "Giới thiệu" })).toHaveAttribute("href", "/about");
  });

  it("exposes tap-to-call and mailto links", () => {
    const { container } = render(<SiteFooter />);
    const telLink = screen.getByRole("link", { name: /ĐT:/ });
    expect(telLink.getAttribute("href")).toMatch(/^tel:/);
    const mailLink = container.querySelector('a[href^="mailto:"]');
    expect(mailLink).not.toBeNull();
    expect(mailLink?.getAttribute("href")).toMatch(/^mailto:.+@.+/);
  });

  it("links Zalo entries to a zalo.me deep link, not tel:", () => {
    render(<SiteFooter />);
    const zaloSocial = screen.getByRole("link", { name: "Zalo" });
    expect(zaloSocial.getAttribute("href")).toMatch(/^https:\/\/zalo\.me\//);
    const zaloContact = screen.getByRole("link", { name: /^Zalo:/ });
    expect(zaloContact.getAttribute("href")).toMatch(/^https:\/\/zalo\.me\//);
  });

  it("renders the copyright line", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/© 2026 Nhà May Thanh Lộc/)).toBeInTheDocument();
  });

  it("renders social links with accessible labels", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Facebook" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Instagram" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zalo" })).toBeInTheDocument();
  });

  it("uses a single <footer> landmark", () => {
    const { container } = render(<SiteFooter />);
    expect(container.querySelectorAll("footer")).toHaveLength(1);
  });
});
