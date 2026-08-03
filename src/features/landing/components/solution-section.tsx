"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";
import { Star, Search, PenTool, CheckCircle2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FashionImage } from "@/shared/components/fashion-image";
import { useWaitlistDialog } from "@/features/landing/components/waitlist-dialog-provider";

// Conceptual lifestyle image representing the Fashion360 experience — not a
// claim that these are real Fashion360 users or designers. Source photo is
// landscape (904x608); object-position is tuned to keep the designer's face
// and sketch fully in frame while carrying over as much of the customer's
// silhouette as the 4:5 portrait crop allows.
const CONSULTATION_IMAGE_SRC = "/images/fashion360/consultation/designer-customer-consultation.png";

const JOURNEY_STEPS = [
  { icon: Search, label: "Discover a Designer" },
  { icon: PenTool, label: "Create Your Design" },
  { icon: CheckCircle2, label: "Approve" },
  { icon: Truck, label: "Track Your Order" },
];

// Part of the cream "campaign zone" that runs Hero → Problem → Solution →
// Craftsmanship — CraftsmanshipSection (next) is the one that closes it out
// with a gradient back to --background, so this stays a solid cream fill.
export function SolutionSection() {
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
        <div className="absolute top-10 right-[8%] size-64 rounded-full bg-primary/10 blur-3xl" />
        <svg className="absolute bottom-16 left-[4%] size-28 text-primary/15" viewBox="0 0 200 200" fill="none">
          <path d="M10 100 Q 100 10 190 60" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <Star className="absolute top-[12%] right-[28%] size-3 fill-warning/50 text-warning/50" />
        <div className="absolute bottom-[20%] right-[14%] size-3 rounded-full border-2 border-primary/25" />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <motion.div
          className="order-2 lg:order-1"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          {...fadeUp(0)}
        >
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">The Future of Custom Fashion</p>
          <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Your Fashion Journey, <span className="text-primary">Built Around You.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            From finding the right fashion designer to bringing your vision to life, Fashion360 is
            building a simpler way to discover, collaborate, design, and manage your fashion
            experience, all in one place.
          </p>
          <Button size="lg" className="mt-8" onClick={() => openWaitlist("CUSTOMER")}>
            Join the Waitlist
          </Button>
        </motion.div>

        <div className="relative order-1 lg:order-2">
          {/* FashionImage's own `reveal`/`hoverScale` own the entrance and
              hover treatment now — no separate wrapper animation, to avoid
              two competing entrance animations on the same image. */}
          <FashionImage
            category="lifestyle"
            aspect="4/5"
            alt="A conceptual image representing a fashion designer consulting with a customer on a custom design"
            src={CONSULTATION_IMAGE_SRC}
            objectPosition="62% 20%"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="shadow-lg"
            reveal="side"
            hoverScale
          />

          <motion.div
            className="absolute -bottom-6 -left-4 w-[min(200px,55%)] rounded-2xl border border-white/50 bg-white/90 p-3.5 shadow-xl backdrop-blur-md sm:-left-6"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            {...fadeUp(0.4)}
          >
            <p className="text-[11px] font-semibold text-foreground">Your Fashion Journey</p>
            <div className="mt-2.5 space-y-1.5">
              {JOURNEY_STEPS.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                    <step.icon className="size-3" strokeWidth={2} />
                  </span>
                  <span className="text-[10px] font-medium text-foreground">{step.label}</span>
                  {i === JOURNEY_STEPS.length - 1 && <span className="ml-auto size-1.5 rounded-full bg-warning" />}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
