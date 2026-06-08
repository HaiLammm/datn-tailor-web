/**
 * RevealOnScroll smoke test — Story 15.5.
 * Under reduced motion the wrapper renders a plain <div>, so children are
 * always present (and the test is deterministic without an IntersectionObserver).
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("framer-motion", () => ({ useReducedMotion: () => true }));

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

  it("passes through a className", () => {
    const { container } = render(
      <RevealOnScroll className="custom-reveal">
        <span>x</span>
      </RevealOnScroll>
    );
    expect(container.querySelector(".custom-reveal")).toBeInTheDocument();
  });
});
