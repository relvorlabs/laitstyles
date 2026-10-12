"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";
import { formatNaira } from "@/lib/admin/shared/formatters";

/**
 * The ledger band's lead figure. Server HTML and the first client render both show the
 * real value, so there is no hydration mismatch and no ₦0 flash; the spring only runs
 * after mount, from a deterministic 72% seed, and never for reduced-motion readers.
 */
export function LedgerLeadFigure({ value }: { value: number }) {
  const prefersReducedMotion = useReducedMotion();
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => formatNaira(Math.round(current)));

  useEffect(() => {
    if (prefersReducedMotion) return;
    spring.jump(Math.round(value * 0.72));
    spring.set(value);
  }, [prefersReducedMotion, spring, value]);

  return <motion.span className="tabular-nums">{display}</motion.span>;
}
