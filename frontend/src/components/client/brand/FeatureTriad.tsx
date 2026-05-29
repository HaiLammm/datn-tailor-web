import type { ReactNode } from "react";

/**
 * FeatureTriad — Story 15.3: reusable 3-pillar "Why-Choose-Us" block (Phase 5).
 * Icon + title + short description, Heritage Gold icons, equal-height cards,
 * responsive 1 → 3 columns. Reused by About (15.3) and Homepage (15.5).
 * Server Component (static).
 */

export interface FeatureItem {
  icon: ReactNode;
  title: string;
  description: string;
}

interface FeatureTriadProps {
  items: FeatureItem[];
  eyebrow?: string;
  heading?: string;
}

const CORMORANT = { fontFamily: "Cormorant Garamond, serif" } as const;

export function FeatureTriad({ items, eyebrow, heading }: FeatureTriadProps) {
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
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {items.map((item, i) => (
          <li
            key={`${item.title}-${i}`}
            className="h-full flex flex-col bg-white border border-[#ece7da] rounded-2xl p-8 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
          >
            <span
              aria-hidden="true"
              className="w-14 h-14 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] grid place-items-center mb-5"
            >
              {item.icon}
            </span>
            <h3 className="text-2xl font-serif font-semibold text-[#1A2B4C] mb-2" style={CORMORANT}>
              {item.title}
            </h3>
            <p className="text-[#6B7280] text-[15px] leading-relaxed">{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
