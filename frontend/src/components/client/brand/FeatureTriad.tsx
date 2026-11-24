/**
 * FeatureTriad — Story 15.3: reusable 3-pillar "Why-Choose-Us" block (Phase 5).
 * Numbered list (large Cormorant numerals, no cards or icon tiles) — title +
 * short description, responsive 1 → 3 columns. Reused by About (15.3) and Homepage (15.5).
 * Server Component (static).
 */

export interface FeatureItem {
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
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 border-t border-[#1A2B4C]/15 pt-10">
        {items.map((item, i) => (
          <li key={`${item.title}-${i}`} className="flex gap-5 md:block">
            <span
              aria-hidden="true"
              className="shrink-0 block text-5xl md:text-6xl leading-none font-serif font-semibold text-[#7A5C0E] md:mb-4"
              style={CORMORANT}
            >
              {i + 1}.
            </span>
            <div>
              <h3 className="text-2xl font-serif font-semibold text-[#1A2B4C] mb-2" style={CORMORANT}>
                {item.title}
              </h3>
              <p className="text-[#6B7280] text-[15px] leading-relaxed">{item.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
