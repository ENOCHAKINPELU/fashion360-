"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, UserRound, Shirt, Camera, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// The one place a marketing/editorial image is rendered — real photography
// isn't available yet (see public/images/fashion360/IMAGE-CHECKLIST.md), so
// every image slot on the landing page renders through this component: pass
// `src` once a real file exists and it swaps in with next/image, no layout
// change. This deliberately uses next/image (unlike the rest of the app,
// which uses plain <img> for dynamic user-uploaded content like business
// logos and design photos) because these are known, build-time-bundled
// marketing assets — the case next/image is actually meant for.
const ASPECT_CLASS = {
  "16/9": "aspect-[16/9]",
  "4/5": "aspect-[4/5]",
  "1/1": "aspect-[1/1]",
  // Fills its parent edge-to-edge instead of sizing itself to an aspect
  // ratio — the parent must establish height (e.g. h-full inside a sized
  // flex/grid column), used for immersive campaign moments like the hero.
  fill: "absolute inset-0 h-full w-full",
} as const;

type FashionImageCategory = "hero" | "portrait" | "product" | "lifestyle";

const CATEGORY_STYLE: Record<FashionImageCategory, { gradient: string; icon: LucideIcon }> = {
  hero: { gradient: "from-primary/25 via-secondary/15 to-accent-soft", icon: Sparkles },
  portrait: { gradient: "from-secondary/20 via-accent-soft to-primary/10", icon: UserRound },
  product: { gradient: "from-accent-soft via-muted to-secondary/15", icon: Shirt },
  lifestyle: { gradient: "from-primary/15 via-muted-surface to-secondary/20", icon: Camera },
};

// Editorial-magazine-style entrance: the wrapper clips (overflow-hidden,
// already true of every FashionImage), the image itself starts
// scaled/offset and settles into place as it enters the viewport — never
// just a plain fade. Opt-in only (reveal prop) so every existing call site
// is unaffected unless deliberately upgraded, per "use selectively, not on
// every image."
const REVEAL_INITIAL = {
  up: { opacity: 0, y: 48, scale: 1.08 },
  side: { opacity: 0, x: 48, scale: 1.08 },
  scale: { opacity: 0, scale: 1.15 },
} as const;

export function FashionImage({
  src,
  alt,
  aspect,
  category,
  className,
  sizes,
  priority,
  objectPosition,
  reveal,
  revealDelay = 0,
  hoverScale = false,
}: {
  src?: string;
  alt: string;
  aspect: keyof typeof ASPECT_CLASS;
  category: FashionImageCategory;
  className?: string;
  sizes?: string;
  priority?: boolean;
  // e.g. "75% 15%" — keeps a specific part of the source photo (a face, a
  // garment detail) in frame when the container's aspect ratio crops it.
  // Arbitrary values, so this is a style prop rather than a Tailwind class.
  objectPosition?: string;
  // Editorial entrance direction — omit for a plain (non-animated) render.
  reveal?: "up" | "side" | "scale";
  revealDelay?: number;
  // Subtle hover zoom (max scale 1.03–1.04) for hero/major editorial images.
  hoverScale?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const revealProps = reveal
    ? {
        initial: reduceMotion ? { opacity: 0 } : REVEAL_INITIAL[reveal],
        whileInView: { opacity: 1, x: 0, y: 0, scale: 1 },
        viewport: { once: true, margin: "-60px" },
        transition: { duration: reduceMotion ? 0.3 : 0.9, delay: reduceMotion ? 0 : revealDelay, ease: [0.16, 1, 0.3, 1] as const },
      }
    : {};
  // Nested (not top-level) transition so it doesn't collide with
  // revealProps' own top-level `transition` when both are spread below.
  const hoverProps = hoverScale && !reduceMotion
    ? { whileHover: { scale: 1.035, transition: { duration: 0.5, ease: "easeOut" as const } } }
    : {};

  if (src) {
    return (
      <div className={cn("relative overflow-hidden rounded-2xl", ASPECT_CLASS[aspect], className)}>
        <motion.div className="absolute inset-0" {...revealProps} {...hoverProps}>
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes ?? "100vw"}
            className="object-cover"
            style={objectPosition ? { objectPosition } : undefined}
          />
        </motion.div>
      </div>
    );
  }

  const { gradient, icon: Icon } = CATEGORY_STYLE[category];

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br",
        gradient,
        ASPECT_CLASS[aspect],
        className
      )}
    >
      {/* Faint editorial texture — pure CSS, no image request */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 14px)",
          color: "var(--foreground)",
        }}
      />
      <Icon className="relative size-8 text-foreground/25 sm:size-10" strokeWidth={1.25} />
    </div>
  );
}
