"use client";

/**
 * RevealOnScroll — Story 15.5: scroll-driven section reveal (Phase 5).
 * Wraps a section and fades/slides it in when it enters the viewport.
 * Respects prefers-reduced-motion: under reduced motion it renders a plain
 * <div> with no animation so content is visible immediately.
 */

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface RevealOnScrollProps {
  children: ReactNode;
  /** Optional stagger delay in seconds. */
  delay?: number;
  className?: string;
}

export function RevealOnScroll({ children, delay = 0, className }: RevealOnScrollProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
