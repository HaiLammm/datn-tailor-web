import type { ReactNode } from "react";

/**
 * HeroBanner — shared brand-presence hero (Phase 5).
 * Story 15.2: `showroom-compact` variant.
 * Story 15.3: `about` full-bleed variant + optional `eyebrow`.
 * `home` is completed in Story 15.5 (uses the generic fallback for now).
 */

type HeroVariant = "home" | "about" | "showroom-compact";

interface HeroBannerProps {
  variant: HeroVariant;
  title: ReactNode;
  subline?: string;
  /** Small uppercase gold label above the title (about/home variants). */
  eyebrow?: string;
  /** Optional CTA cluster rendered below the subline. */
  children?: ReactNode;
}

const CORMORANT = { fontFamily: "Cormorant Garamond, serif" } as const;

export function HeroBanner({ variant, title, subline, eyebrow, children }: HeroBannerProps) {
  if (variant === "showroom-compact") {
    return (
      <header className="bg-gradient-to-b from-[#1A2B4C] to-[#22335A] text-[#F9F7F2] py-10 md:py-14">
        <div className="container mx-auto px-4 text-center">
          {eyebrow && (
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37] mb-3">
              {eyebrow}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl font-serif font-bold" style={CORMORANT}>
            {title}
          </h1>
          {subline && (
            <p className="mt-3 text-base md:text-lg text-[#F9F7F2]/85 max-w-2xl mx-auto">
              {subline}
            </p>
          )}
          {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
        </div>
      </header>
    );
  }

  if (variant === "about") {
    return (
      <header className="relative overflow-hidden bg-gradient-to-br from-[#101b33] via-[#1A2B4C] to-[#22335A] text-[#F9F7F2] py-20 md:py-28">
        {/* Soft gold glow accent */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_85%_15%,rgba(212,175,55,0.28),transparent_60%)]"
        />
        <div className="relative container mx-auto px-4 max-w-3xl">
          {eyebrow && (
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37] mb-4">
              {eyebrow}
            </span>
          )}
          <h1
            className="text-4xl md:text-6xl font-serif font-bold leading-tight"
            style={CORMORANT}
          >
            {title}
          </h1>
          {subline && (
            <p className="mt-5 text-lg text-[#F9F7F2]/85 max-w-2xl">{subline}</p>
          )}
          {children && <div className="mt-7 flex flex-wrap gap-3">{children}</div>}
        </div>
      </header>
    );
  }

  // `home` full-bleed variant is completed in Story 15.5.
  return (
    <header className="bg-[#1A2B4C] text-[#F9F7F2] py-16">
      <div className="container mx-auto px-4 text-center">
        {eyebrow && (
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37] mb-3">
            {eyebrow}
          </span>
        )}
        <h1 className="text-4xl md:text-6xl font-serif font-bold" style={CORMORANT}>
          {title}
        </h1>
        {subline && <p className="mt-4 text-lg text-[#F9F7F2]/85 max-w-2xl mx-auto">{subline}</p>}
        {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </header>
  );
}
