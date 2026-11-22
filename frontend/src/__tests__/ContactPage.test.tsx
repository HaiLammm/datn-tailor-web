/**
 * Contact page smoke test — Story 15.4.
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ContactPage from "@/app/(customer)/contact/page";

// Stub the client form island (its server-action import is irrelevant here).
jest.mock("@/components/client/brand/ContactForm", () => ({
  __esModule: true,
  default: () => <div data-testid="contact-form" />,
}));

describe("ContactPage", () => {
  it("renders a titled map iframe, tel link (no dead mailto), and the contact form", () => {
    render(<ContactPage />);

    const iframe = screen.getByTitle("Bản đồ tới Áo Dài Thanh Lộc");
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("title")).toBeTruthy();

    const tel = screen.getByRole("link", { name: /Điện thoại:/ });
    expect(tel).toHaveAttribute("href", expect.stringMatching(/^tel:/));

    expect(screen.queryByRole("link", { name: /Email:/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute(
      "href",
      "https://facebook.com/dangloc"
    );

    expect(screen.getByTestId("contact-form")).toBeInTheDocument();
  });
});
