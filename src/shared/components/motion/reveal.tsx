"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";

// Standardizes the scroll-in pattern the landing page already used ad hoc
// (see the pre-rewrite features-section.tsx) into one place, and adds
// prefers-reduced-motion support that nothing in the codebase had before —
// reduced motion drops the y-offset/scale and shortens the transition to a
// near-instant fade instead of skipping the animation prop entirely, so
// content doesn't pop in with zero transition at all.
export function Reveal({
  children,
  delay = 0,
  y = 16,
  once = true,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  once?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const transition: Transition = reduceMotion
    ? { duration: 0.15, delay: 0 }
    : { duration: 0.5, delay, ease: "easeOut" };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduceMotion ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
