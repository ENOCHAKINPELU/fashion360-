"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";
import { Star, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FashionImage } from "@/shared/components/fashion-image";
import { useWaitlistDialog } from "@/features/landing/components/waitlist-dialog-provider";

// Conceptual image of the type of fashion professional Fashion360 aims to
// connect customers with — not a claim she's a registered Fashion360
// designer (pre-launch, none are yet). Source photo is landscape
// (1536x1024); object-position is tuned so her face, working hands, and the
// purple-and-gold fabric she's stitching all stay in the 4:5 portrait crop —
// the standing mannequin dress on the far left and the sewing machine on the
// far right both fall mostly outside the crop at this ratio, which is why
// the spec explicitly hedges the sewing machine as "if possible."
const CRAFTSMANSHIP_IMAGE_SRC = "/images/fashion360/portfolio/designer-at-work.png";

const DESIGN_JOURNEY_STEPS = [
  { label: "Design Reference", status: "Shared", done: true },
  { label: "Design Preview", status: "Ready", done: true },
  { label: "Customer Approval", status: "Pending", done: false },
];

// Part of the cream "campaign zone" that runs Hero → Problem → Solution →
// Craftsmanship → Visualization — VisualizationSection (next) is the one
// that closes it out with a gradient back to --background, so this stays a
// solid cream fill.
export function CraftsmanshipSection() {
  const reduceMotion = useReducedMotion();
  const openWaitlist = useWaitlistDialog();

  const fadeUp = (delay: number): { transition: Transition } => ({
    transition: reduceMotion ? { duration: 0.2, delay: 0 } : { duration: 0.7, delay, ease: "easeOut" },
  });

  return (
    <section
      className="relative overflow-hidden px-6 py-20 sm:py-24 lg:px-8 lg:py-28"
      style={{ backgroundColor: "var(--campaign-cream)" }}
    >
      {/* Decorative elements — minimal, the photo stays the focus */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-[6%] size-72 rounded-full bg-secondary/10 blur-3xl" />
        <svg className="absolute top-[8%] right-[10%] size-24 text-primary/15" viewBox="0 0 200 200" fill="none">
          <path d="M20 20 Q 120 40 180 160" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <div className="absolute right-[20%] bottom-[18%] size-2.5 rounded-full border-2 border-primary/25" />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="relative order-1">
          {/* FashionImage's own `reveal`/`hoverScale` own the entrance and
              hover treatment now — no separate wrapper animation. */}
          <FashionImage
            category="portrait"
            aspect="4/5"
            alt="A conceptual image of a fashion designer at work, hand-stitching a purple and gold garment in a studio"
            src={CRAFTSMANSHIP_IMAGE_SRC}
            objectPosition="58% center"
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="shadow-lg"
            reveal="scale"
            hoverScale
          />

          <motion.div
            className="absolute -right-4 -bottom-6 w-[min(210px,60%)] rounded-2xl border border-white/50 bg-white/90 p-3.5 shadow-xl backdrop-blur-md sm:-right-6"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            {...fadeUp(0.4)}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-foreground">
              Design Journey
              <Star className="size-2.5 fill-warning text-warning" strokeWidth={2} />
            </p>
            <div className="mt-2.5 space-y-1.5">
              {DESIGN_JOURNEY_STEPS.map((step) => (
                <div key={step.label} className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium text-foreground">{step.label}</span>
                  <span className={`flex items-center gap-1 text-[10px] font-medium ${step.done ? "text-primary" : "text-muted-foreground"}`}>
                    {step.done ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />}
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          className="order-2"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          {...fadeUp(0.15)}
        >
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">From Inspiration to Creation</p>
          <div className="mt-3 h-px w-10 bg-warning" />
          <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Your Vision. <span className="text-primary">Brought to Life.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Great fashion starts with an idea. Fashion360 is building a better way for customers to
            discover skilled fashion designers, share their vision, collaborate on designs, and
            bring their perfect outfit to life.
          </p>
          <Button size="lg" className="mt-8" onClick={() => openWaitlist("CUSTOMER")}>
            Join the Waitlist
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
