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
  it("renders a titled map iframe, tel/mailto links, and the contact form", () => {
    render(<ContactPage />);

    const iframe = screen.getByTitle("Bản đồ tới Nhà May Thanh Lộc");
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("title")).toBeTruthy();

    const tel = screen.getByRole("link", { name: /Điện thoại:/ });
    expect(tel).toHaveAttribute("href", expect.stringMatching(/^tel:/));

    const email = screen.getByRole("link", { name: /Email:/ });
    expect(email).toHaveAttribute("href", expect.stringMatching(/^mailto:/));

    expect(screen.getByTestId("contact-form")).toBeInTheDocument();
  });
});
