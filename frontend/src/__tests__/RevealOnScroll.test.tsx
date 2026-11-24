/**
 * RevealOnScroll smoke test — Story 15.5.
 * The reveal is pure CSS, so children are always rendered and visible in the HTML.
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { RevealOnScroll } from "@/components/client/brand/RevealOnScroll";

describe("RevealOnScroll", () => {
  it("renders its children", () => {
    render(
      <RevealOnScroll>
        <p>Nội dung được hé lộ</p>
      </RevealOnScroll>
    );
    expect(screen.getByText("Nội dung được hé lộ")).toBeInTheDocument();
  });

  it("passes through a className alongside the reveal class", () => {
    const { container } = render(
      <RevealOnScroll className="custom-reveal">
        <span>x</span>
      </RevealOnScroll>
    );
    const el = container.querySelector(".custom-reveal");
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("reveal-on-scroll");
  });

  it("never hides content with an inline style", () => {
    const { container } = render(
      <RevealOnScroll>
        <span>x</span>
      </RevealOnScroll>
    );
    expect(container.firstElementChild).not.toHaveAttribute("style");
  });
});
