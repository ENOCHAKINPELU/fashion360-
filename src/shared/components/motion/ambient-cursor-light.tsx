"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";

// A very soft radial glow that drifts toward the cursor — never a hard
// spotlight, never distracting from text. Large desktop only; DOM mutation
// is rAF-throttled the same way Cursor is, so it never causes a re-render.
export function AmbientCursorLight() {
  const reduceMotion = useReducedMotion();
  const glowRef = useRef<HTMLDivElement>(null);
  const enabled = useMediaQuery("(hover: hover) and (pointer: fine) and (min-width: 1024px)");

  useEffect(() => {
    if (!enabled || reduceMotion) return;
    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    function onMove(e: MouseEvent) {
      x = e.clientX;
      y = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          if (glowRef.current) {
            glowRef.current.style.transform = `translate3d(${x - 240}px, ${y - 240}px, 0)`;
          }
          raf = 0;
        });
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled, reduceMotion]);

  if (!enabled || reduceMotion) return null;

  return (
    <div
      ref={glowRef}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 -z-10 size-[480px] rounded-full opacity-[0.06] blur-3xl"
      style={{
        background: "radial-gradient(circle, var(--primary), transparent 70%)",
        willChange: "transform",
      }}
    />
  );
}
