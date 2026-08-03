"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";
import { Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FashionImage } from "@/shared/components/fashion-image";
import { useWaitlistDialog } from "@/features/landing/components/waitlist-dialog-provider";

// Conceptual image representing the experience Fashion360 is building — not
// a claim of a real customer, a live design, or a real order. Source photo
// is landscape (2048x1428); object-position keeps the tablet (showing the
// design sketch), the hands holding it, and a slice of the design mood
// board all in the 4:5 portrait crop. Flagging honestly: the person is
// photographed from behind/the side, so her face isn't actually visible in
// this shot, unlike the spec's literal requirement — used anyway since it's
// the supplied photo and the tablet-visualization moment is still clear.
const VISUALIZATION_IMAGE_SRC = "/images/fashion360/design-preview/customer-visualizing-design.jpg";

// Closes out the cream "campaign zone" (Hero → Problem → Solution →
// Craftsmanship → here) with a gradient back to the app's normal
// --background, which every section after this one uses.
export function VisualizationSection() {
  const reduceMotion = useReducedMotion();
  const openWaitlist = useWaitlistDialog();

  const fadeUp = (delay: number): { transition: Transition } => ({
    transition: reduceMotion ? { duration: 0.2, delay: 0 } : { duration: 0.7, delay, ease: "easeOut" },
  });

  return (
    <section
      className="relative overflow-hidden px-6 py-20 sm:py-24 lg:px-8 lg:py-28"
      style={{ background: "linear-gradient(to bottom, var(--campaign-cream), var(--background))" }}
    >
      {/* Decorative elements — minimal, the photo stays the focus */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 right-[8%] size-72 rounded-full bg-primary/10 blur-3xl" />
        <Star className="absolute top-[10%] left-[42%] size-3 fill-warning/50 text-warning/50" />
        <div className="absolute bottom-[16%] left-[10%] size-2.5 rounded-full border-2 border-primary/25" />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          {...fadeUp(0)}
        >
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">See It Before It&apos;s Made</p>
          <div className="mt-3 h-px w-10 bg-warning" />
          <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            See Your Vision. <span className="text-primary">Before the First Stitch.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            What if you could have a clearer idea of what your outfit will look like before
            production begins? Fashion360 is building a more visual way to collaborate on custom
            fashion, helping customers explore designs, review their choices, and feel more
            confident about what they&apos;re creating.
          </p>
          <Button size="lg" className="mt-8" onClick={() => openWaitlist("CUSTOMER")}>
            Join the Waitlist
          </Button>
        </motion.div>

        <div className="relative">
          {/* FashionImage's own `reveal`/`hoverScale` own the entrance and
              hover treatment now — no separate wrapper animation. */}
          <FashionImage
            category="lifestyle"
            aspect="4/5"
            alt="A conceptual image of a customer visualizing a fashion design on a tablet, with a design mood board in the background"
            src={VISUALIZATION_IMAGE_SRC}
            objectPosition="48% center"
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="shadow-lg"
            reveal="up"
            hoverScale
          />

          <motion.div
            className="absolute -bottom-6 -left-4 w-[min(220px,60%)] rounded-2xl border border-white/50 bg-white/90 p-3.5 shadow-xl backdrop-blur-md sm:-left-6"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            {...fadeUp(0.4)}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-foreground">
              Your Design Preview
              <Sparkles className="size-2.5 text-warning" strokeWidth={2} />
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">Custom Outfit</p>
            <div className="mt-2 aspect-[4/3] rounded-lg bg-gradient-to-br from-accent-soft via-muted to-secondary/15" />
            <div className="mt-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-semibold text-primary">
                Ready for Review
              </span>
              <span className="text-[10px] font-semibold text-primary">View Design</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
