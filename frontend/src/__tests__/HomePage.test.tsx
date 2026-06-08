/**
 * Homepage Landing smoke test — Story 15.5.
 * HomePage is an async Server Component (awaits fetchGarments), so we await
 * the component before handing the JSX to RTL's render.
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Reduced motion → RevealOnScroll renders a plain div; TestimonialStrip skips auto-advance.
jest.mock("framer-motion", () => ({ useReducedMotion: () => true }));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} />
  ),
}));

// Stub the heavy showroom card (its cart/modal subtree is irrelevant here).
jest.mock("@/components/client/showroom/GarmentCard", () => ({
  GarmentCard: ({ garment }: { garment: { id: string; name: string } }) => (
    <div data-testid="garment-card">{garment.name}</div>
  ),
}));

jest.mock("@/app/actions/garment-actions", () => ({
  fetchGarments: jest.fn(),
}));

import HomePage from "@/app/(customer)/(home)/page";
import { fetchGarments } from "@/app/actions/garment-actions";

const mockFetch = fetchGarments as jest.Mock;

function withFeatured(items: { id: string; name: string }[]) {
  mockFetch.mockResolvedValue({
    data: { items, total: items.length, page: 1, page_size: 4, total_pages: 1 },
    meta: { total: items.length, page: 1, page_size: 4, total_pages: 1 },
  });
}

describe("HomePage (Story 15.5)", () => {
  beforeEach(() => mockFetch.mockReset());

  it("renders the hero, all sections, featured cards and key CTAs", async () => {
    withFeatured([
      { id: "1", name: "Hồng Hạc" },
      { id: "2", name: "Liên Hoa" },
      { id: "3", name: "Thanh Vân" },
    ]);

    render(await HomePage());

    // Hero (two-line headline)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Một tà áo,vẹn cả dáng hình.");

    // Section headings in order
    expect(screen.getByRole("heading", { name: "Vì sao chọn chúng tôi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bộ sưu tập nổi bật" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Hơn một tà áo/ })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Niềm tin được dệt nên" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tà áo của riêng bạn đang chờ được may." })
    ).toBeInTheDocument();

    // Featured cards
    const cards = screen.getAllByTestId("garment-card");
    expect(cards).toHaveLength(3);
    expect(screen.getByText("Hồng Hạc")).toBeInTheDocument();

    // "Xem tất cả →" → /showroom
    expect(screen.getByRole("link", { name: /Xem tất cả/ })).toHaveAttribute("href", "/showroom");
    // Brand story → /about
    expect(screen.getByRole("link", { name: /Nghe trọn câu chuyện/ })).toHaveAttribute(
      "href",
      "/about"
    );
    // Both "Hẹn một buổi trò chuyện" CTAs (hero + closing band) → /booking
    const bookingLinks = screen.getAllByRole("link", { name: "Hẹn một buổi trò chuyện" });
    expect(bookingLinks.length).toBeGreaterThanOrEqual(1);
    bookingLinks.forEach((l) => expect(l).toHaveAttribute("href", "/booking"));
  });

  it("hides the Featured section gracefully when there are no products", async () => {
    withFeatured([]);

    render(await HomePage());

    // No featured cards, no Featured heading — but no blank/broken area.
    expect(screen.queryByTestId("garment-card")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Bộ sưu tập nổi bật" })).toBeNull();

    // The rest of the page still renders.
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Niềm tin được dệt nên" })).toBeInTheDocument();
  });

  it("tolerates a null fetch result (treats it as empty)", async () => {
    mockFetch.mockResolvedValue(null);

    render(await HomePage());

    expect(screen.queryByTestId("garment-card")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("does not render a page-level footer (shared SiteFooter comes from the layout)", async () => {
    withFeatured([{ id: "1", name: "Hồng Hạc" }]);
    const { container } = render(await HomePage());
    expect(container.querySelector("footer")).toBeNull();
  });
});
