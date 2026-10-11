'use client';

import type { ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { usePrefersReducedMotion } from './useMotionPreference';

/**
 * Drifts its children upward as the page scrolls past the hero. `depth` is
 * pixels of travel over the first 700px of scroll: nearer layers move more.
 */
export function Parallax({ depth, className, children }: { depth: number; className?: string; children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, reduced ? 0 : -depth], {
    clamp: true,
  });
  return (
    <motion.div className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}
