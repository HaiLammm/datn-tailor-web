/**
 * RevealOnScroll — Story 15.5: section slides up slightly as it enters the viewport.
 *
 * Pure CSS (`.reveal-on-scroll` in globals.css, scroll-driven animation):
 * content is in the HTML and visible without JavaScript. Browsers without
 * `animation-timeline: view()` and users with reduced motion get no animation,
 * never hidden content.
 */

import type { ReactNode } from "react";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
}

export function RevealOnScroll({ children, className }: RevealOnScrollProps) {
  return (
    <div className={className ? `reveal-on-scroll ${className}` : "reveal-on-scroll"}>
      {children}
    </div>
  );
}
