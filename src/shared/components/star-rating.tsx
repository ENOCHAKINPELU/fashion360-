"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Display-only stars (Part 23's rating summaries, review cards, etc).
export function StarRating({ value, size = "sm", showValue = false }: { value: number; size?: "sm" | "md" | "lg"; showValue?: boolean }) {
  const sizeClass = size === "lg" ? "size-5" : size === "md" ? "size-4" : "size-3.5";
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn(sizeClass, i <= Math.round(value) ? "fill-warning text-warning" : "text-muted-foreground/40")} />
        ))}
      </span>
      {showValue && <span className="text-sm font-medium text-foreground">{value.toFixed(1)}</span>}
    </span>
  );
}

// Touch-friendly interactive star input (Part 6/25/38).
export function StarRatingInput({ value, onChange, size = "lg" }: { value: number; onChange: (value: number) => void; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "size-8" : size === "md" ? "size-6" : "size-5";
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="p-1 transition-transform active:scale-95"
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
        >
          <Star className={cn(sizeClass, i <= value ? "fill-warning text-warning" : "text-muted-foreground/40")} />
        </button>
      ))}
    </span>
  );
}
