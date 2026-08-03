"use client";

import type { RefObject } from "react";
import { useMotionValue, useSpring, useReducedMotion } from "framer-motion";

// Subtle magnetic pull for primary CTAs only (per spec — not every button).
// Desktop-only by nature: touch devices never fire mousemove, so this is a
// no-op there without any extra device-detection branch needed.
//
// Takes the ref as a parameter (caller owns `useRef`) rather than creating
// and returning one bundled with other values — returning a ref inside a
// plain object trips the react-hooks/refs lint rule's "ref accessed during
// render" heuristic at every call site that reads a property off the
// returned object, even though nothing here actually reads `.current`
// during render. Keeping the ref external sidesteps that false positive.
//
// `lift` (the "button moves upward on hover" micro-interaction) is baked
// into the same `y` motion value as the magnetic pull, rather than layered
// on top via a separate `whileHover={{ y: ... }}` — a style-bound motion
// value and a whileHover target on the same transform property fight each
// other, so this keeps y as one combined, single source of truth.
export function useMagnetic(ref: RefObject<HTMLButtonElement | null>, strength = 0.3, max = 8, lift = 0) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  function onMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(Math.max(-max, Math.min(max, relX * strength)));
    y.set(Math.max(-max, Math.min(max, relY * strength)) - lift);
  }

  function onMouseEnter() {
    if (reduceMotion) return;
    y.set(-lift);
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return { style: { x: springX, y: springY }, onMouseMove, onMouseEnter, onMouseLeave };
}
