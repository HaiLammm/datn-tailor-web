import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { HeroBanner } from "@/components/client/brand/HeroBanner";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} />
  ),
}));

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

describe("HeroBanner — home variant (Story 15.5)", () => {
  it("renders eyebrow, two-line title, subline and dual CTA children", () => {
    render(
      <HeroBanner
        variant="home"
        eyebrow="Áo dài may riêng"
        title={
          <>
            Một tà áo,
            <br />
            vẹn cả dáng hình.
          </>
        }
        subline="Nơi mỗi đường kim kể một câu chuyện riêng."
      >
        <a href="#showroom">Dạo xem bộ sưu tập</a>
        <a href="#booking">Hẹn một buổi trò chuyện</a>
      </HeroBanner>
    );
    expect(screen.getByText("Áo dài may riêng")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Một tà áo,vẹn cả dáng hình."
    );
    expect(screen.getByText("Nơi mỗi đường kim kể một câu chuyện riêng.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dạo xem bộ sưu tập" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hẹn một buổi trò chuyện" })).toBeInTheDocument();
  });

  it("applies the full-bleed Indigo gradient surface", () => {
    const { container } = render(<HeroBanner variant="home" title="Một tà áo" />);
    const header = container.querySelector("header");
    expect(header).toHaveClass("from-[#101b33]");
    expect(header).toHaveClass("min-h-[78vh]");
    expect(header).toHaveClass("text-[#F9F7F2]");
  });

  it("shows a decorative scroll cue", () => {
    render(<HeroBanner variant="home" title="Một tà áo" />);
    expect(screen.getByText("Cuộn xuống")).toBeInTheDocument();
  });

  it("renders a background image when imageSrc is provided", () => {
    const { container } = render(
      <HeroBanner variant="home" title="Một tà áo" imageSrc="/hero.jpg" />
    );
    expect(container.querySelector("img")).toBeInTheDocument();
  });
});
