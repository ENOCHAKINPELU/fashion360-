"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

// Small dot cursor that expands over interactive elements. Desktop-only
// (`hover: hover` + `pointer: fine` — excludes touch and coarse-pointer
// devices, not just narrow viewports, so a mouse-equipped tablet still gets
// it while a touch laptop in tablet mode doesn't). Position updates mutate
// the DOM node directly via rAF instead of React state, so mousemove never
// triggers a re-render.
export function Cursor() {
  const reduceMotion = useReducedMotion();
  const dotRef = useRef<HTMLDivElement>(null);
  const enabled = useMediaQuery("(hover: hover) and (pointer: fine)");
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const active = enabled && !reduceMotion;
    document.body.classList.toggle("cursor-none-desktop", active);
    if (!active) return;

    let raf = 0;
    let x = 0;
    let y = 0;

    function onMove(e: MouseEvent) {
      x = e.clientX;
      y = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          if (dotRef.current) {
            dotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
          }
          raf = 0;
        });
      }
    }

    function onOver(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      setHovering(!!target?.closest("a, button, [data-cursor-hover]"));
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      if (raf) cancelAnimationFrame(raf);
      document.body.classList.remove("cursor-none-desktop");
    };
  }, [enabled, reduceMotion]);

  if (!enabled || reduceMotion) return null;

  return (
    <div
      ref={dotRef}
      aria-hidden
      className={cn(
        "pointer-events-none fixed top-0 left-0 z-[100] rounded-full bg-primary/70 transition-[width,height] duration-200 ease-out",
        hovering ? "size-8" : "size-2.5"
      )}
      style={{ willChange: "transform" }}
    />
  );
}
