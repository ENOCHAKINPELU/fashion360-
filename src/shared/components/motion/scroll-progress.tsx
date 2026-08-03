"use client";

import { motion, useScroll, useSpring } from "framer-motion";

// Thin, minimal — reflects position on the page, never visually dominant.
// useScroll/useSpring already drive this off a single transform (scaleX),
// so it costs nothing extra beyond what framer-motion's scroll listener
// does; no reduced-motion gate needed since it's an opacity/scale readout,
// not a triggered animation.
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      className="fixed top-0 right-0 left-0 z-50 h-0.5 origin-left bg-primary"
      style={{ scaleX }}
    />
  );
}
