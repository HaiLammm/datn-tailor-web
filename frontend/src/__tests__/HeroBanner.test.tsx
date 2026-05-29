import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { HeroBanner } from "@/components/client/brand/HeroBanner";

describe("HeroBanner (Story 15.2)", () => {
  it("renders showroom-compact title and subline", () => {
    render(
      <HeroBanner
        variant="showroom-compact"
        title="Bộ sưu tập áo dài"
        subline="Những tà áo cho mọi dịp vui"
      />
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bộ sưu tập áo dài");
    expect(screen.getByText("Những tà áo cho mọi dịp vui")).toBeInTheDocument();
  });

  it("uses Cormorant Garamond for the heading", () => {
    render(<HeroBanner variant="showroom-compact" title="Bộ sưu tập áo dài" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveStyle({ fontFamily: "Cormorant Garamond, serif" });
    expect(heading).toHaveClass("font-serif");
  });

  it("applies the Indigo boutique surface", () => {
    const { container } = render(
      <HeroBanner variant="showroom-compact" title="Bộ sưu tập áo dài" />
    );
    const header = container.querySelector("header");
    expect(header).toHaveClass("from-[#1A2B4C]");
    expect(header).toHaveClass("text-[#F9F7F2]");
  });

  it("renders CTA children when provided", () => {
    render(
      <HeroBanner variant="showroom-compact" title="Bộ sưu tập áo dài">
        <a href="/booking">Đặt lịch</a>
      </HeroBanner>
    );
    expect(screen.getByRole("link", { name: "Đặt lịch" })).toBeInTheDocument();
  });
});

describe("HeroBanner — about variant (Story 15.3)", () => {
  it("renders the eyebrow, title and subline", () => {
    render(
      <HeroBanner
        variant="about"
        eyebrow="Về chúng tôi"
        title="Giữ hồn áo dài"
        subline="Một tiệm may nặng lòng với áo dài."
      />
    );
    expect(screen.getByText("Về chúng tôi")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Giữ hồn áo dài");
    expect(screen.getByText("Một tiệm may nặng lòng với áo dài.")).toBeInTheDocument();
  });

  it("uses a full-bleed Indigo gradient surface with ivory text", () => {
    const { container } = render(<HeroBanner variant="about" title="Giữ hồn áo dài" />);
    const header = container.querySelector("header");
    expect(header).toHaveClass("from-[#101b33]");
    expect(header).toHaveClass("text-[#F9F7F2]");
  });

  it("supports a ReactNode title (two-line headline)", () => {
    render(
      <HeroBanner
        variant="about"
        title={
          <>
            Giữ hồn áo dài,
            <br />
            qua bao mùa thương.
          </>
        }
      />
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Giữ hồn áo dài,qua bao mùa thương."
    );
  });
});
