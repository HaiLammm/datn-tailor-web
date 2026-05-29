"use client";

/**
 * TestimonialStrip — Story 15.3: reusable customer-testimonials block (Phase 5).
 * Desktop: static 3-up grid. Mobile: single-card carousel that auto-advances
 * with accessible prev/next buttons + dot indicators. Reused by About (15.3)
 * and Homepage (15.5). Respects prefers-reduced-motion.
 */

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export interface TestimonialItem {
  quote: string;
  name: string;
  context?: string;
  avatarInitial?: string;
}

interface TestimonialStripProps {
  items: TestimonialItem[];
  eyebrow?: string;
  heading?: string;
}

const CORMORANT = { fontFamily: "Cormorant Garamond, serif" } as const;
const AUTO_ADVANCE_MS = 5000;

function TestimonialCard({ item }: { item: TestimonialItem }) {
  return (
    <figure className="h-full flex flex-col bg-white border border-[#ece7da] rounded-2xl p-8 shadow-sm">
      <blockquote
        className="font-serif italic text-xl text-[#1A2B4C] leading-relaxed mb-5 flex-1"
        style={CORMORANT}
      >
        “{item.quote}”
      </blockquote>
      <figcaption className="flex items-center gap-3">
        {item.avatarInitial && (
          <span
            aria-hidden="true"
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#b8941f] text-[#1A2B4C] font-bold grid place-items-center"
          >
            {item.avatarInitial}
          </span>
        )}
        <span>
          <span className="block text-sm font-semibold text-[#1A1A2E]">{item.name}</span>
          {item.context && <span className="block text-xs text-[#6B7280]">{item.context}</span>}
        </span>
      </figcaption>
    </figure>
  );
}

export function TestimonialStrip({ items, eyebrow, heading }: TestimonialStripProps) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const count = items.length;

  useEffect(() => {
    if (reduceMotion || count <= 1) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [reduceMotion, count]);

  const goPrev = () => setActive((prev) => (prev - 1 + count) % count);
  const goNext = () => setActive((prev) => (prev + 1) % count);

  if (count === 0) return null;

  // Guard against a stale index if `items` shrank since the last render.
  const safeActive = Math.min(active, count - 1);

  return (
    <div className="container mx-auto px-4">
      {(eyebrow || heading) && (
        <div className="text-center max-w-2xl mx-auto mb-12">
          {eyebrow && (
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37] mb-2">
              {eyebrow}
            </span>
          )}
          {heading && (
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-[#1A2B4C]" style={CORMORANT}>
              {heading}
            </h2>
          )}
        </div>
      )}

      {/* Desktop: full grid */}
      <ul className="hidden md:grid md:grid-cols-3 gap-6">
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="h-full">
            <TestimonialCard item={item} />
          </li>
        ))}
      </ul>

      {/* Mobile: single-card carousel */}
      <div className="md:hidden">
        <TestimonialCard item={items[safeActive]} />
        {count > 1 && (
          <div className="mt-5 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Đánh giá trước"
              className="p-2 min-h-[44px] min-w-[44px] grid place-items-center rounded-full border border-[#ddd5c4] text-[#1A2B4C] hover:border-[#D4AF37] transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              {items.map((item, i) => (
                <button
                  key={`${item.name}-${i}`}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Xem đánh giá ${i + 1}`}
                  aria-current={i === safeActive ? "true" : undefined}
                  className={`h-2.5 w-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] ${
                    i === safeActive ? "bg-[#D4AF37]" : "bg-[#ddd5c4]"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goNext}
              aria-label="Đánh giá sau"
              className="p-2 min-h-[44px] min-w-[44px] grid place-items-center rounded-full border border-[#ddd5c4] text-[#1A2B4C] hover:border-[#D4AF37] transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
