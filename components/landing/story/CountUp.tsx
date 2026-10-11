'use client';

import { useEffect, useRef } from 'react';
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react';
import { usePrefersReducedMotion } from './useMotionPreference';

/**
 * A number that counts up once when it scrolls into view. The final value is
 * server-rendered and reserves the width, so there is no layout shift, and
 * nothing is lost without JavaScript or with reduced motion.
 */
export function CountUp({
  value,
  suffix = '',
  duration = 1.1,
  delay = 0,
  className,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const n = useMotionValue(value);
  const text = useTransform(n, (v) => `${Math.round(v)}${suffix}`);
  const armed = useRef(false);

  // Only numbers that start below the fold count up; they wait at 0.
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || armed.current) return;
    if (el.getBoundingClientRect().top > window.innerHeight * 0.9) {
      armed.current = true;
      n.set(0);
    }
  }, [reduced, n]);

  useEffect(() => {
    if (reduced) {
      n.set(value);
      return;
    }
    if (!armed.current || !inView) return;
    const controls = animate(n, value, {
      duration,
      delay,
      ease: [0.2, 0, 0, 1],
    });
    return () => controls.stop();
  }, [inView, reduced, value, duration, delay, n]);

  return (
    <span className={`inline-grid tabular-nums ${className ?? ''}`}>
      <span className="invisible col-start-1 row-start-1" aria-hidden="true">{`${value}${suffix}`}</span>
      <motion.span ref={ref} className="col-start-1 row-start-1 text-right">
        {text}
      </motion.span>
    </span>
  );
}
