import type { ReactNode } from "react";
import Image from "next/image";

/**
 * HeroBanner — shared brand-presence hero (Phase 5).
 * Story 15.2: `showroom-compact` variant.
 * Story 15.3: `about` full-bleed variant + optional `eyebrow`.
 * Story 15.5: `home` full-bleed variant + optional `imageSrc` + scroll cue.
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
  /** Optional full-bleed background image (home variant). Rendered via next/image with priority. */
  imageSrc?: string;
}

const CORMORANT = { fontFamily: "Cormorant Garamond, serif" } as const;

export function HeroBanner({ variant, title, subline, eyebrow, children, imageSrc }: HeroBannerProps) {
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

  // `home` full-bleed signature hero (Story 15.5).
  return (
    <header className="relative overflow-hidden flex items-center min-h-[78vh] md:min-h-[86vh] bg-gradient-to-br from-[#101b33] via-[#1A2B4C] to-[#22335A] text-[#F9F7F2]">
      {/* Optional signature photo (next/image, priority for above-the-fold) */}
      {imageSrc && (
        <Image
          src={imageSrc}
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      )}
      {/* Indigo overlay (keeps text legible over any photo) + soft gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#101b33]/85 via-[#1A2B4C]/75 to-[#22335A]/70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_110%_at_80%_10%,rgba(212,175,55,0.30),transparent_60%)]"
      />

      <div className="relative container mx-auto px-4 py-24 md:py-28 text-center max-w-3xl">
        {eyebrow && (
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37] mb-4">
            {eyebrow}
          </span>
        )}
        <h1 className="text-4xl md:text-6xl font-serif font-bold leading-tight" style={CORMORANT}>
          {title}
        </h1>
        {subline && (
          <p className="mt-5 text-lg text-[#F9F7F2]/85 max-w-2xl mx-auto">{subline}</p>
        )}
        {children && (
          <div className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center gap-4">
            {children}
          </div>
        )}
      </div>

      {/* Scroll cue (decorative; inert under reduced motion) */}
      <div
        aria-hidden="true"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#F9F7F2]/70"
      >
        <span className="text-[11px] uppercase tracking-[0.2em]">Cuộn xuống</span>
        <span className="h-9 w-5 rounded-full border border-[#F9F7F2]/40 grid place-items-start p-1">
          <span className="h-2 w-1 rounded-full bg-[#D4AF37] animate-bounce motion-reduce:animate-none" />
        </span>
      </div>
    </header>
  );
}
