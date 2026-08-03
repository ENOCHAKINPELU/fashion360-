"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

// Very subtle mouse-position 3D tilt (max ±3deg) plus a lift-on-hover, for
// premium card surfaces (Product Experience mockups). Desktop-only by
// nature — touch devices don't fire mousemove, so it's inert there without
// a separate code path; reduced-motion collapses it to a plain lift.
export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springConfig = { stiffness: 250, damping: 22, mass: 0.5 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 6);
    rotateX.set(py * -6);
  }

  function onMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{
        rotateX: springRotateX as MotionValue<number>,
        rotateY: springRotateY as MotionValue<number>,
        transformPerspective: 800,
      }}
      className={cn("[transform-style:preserve-3d]", className)}
    >
      {children}
    </motion.div>
  );
}
