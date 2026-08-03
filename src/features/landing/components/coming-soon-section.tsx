"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/shared/components/motion/reveal";
import { useWaitlistDialog } from "@/features/landing/components/waitlist-dialog-provider";

const PATHS = [
  {
    role: "CUSTOMER" as const,
    label: "Customers",
    blurb: "Be among the first to discover and work with fashion designers on Fashion360.",
    cta: "Join Customer Waitlist",
  },
  {
    role: "DESIGNER" as const,
    label: "Designers",
    blurb: "Be among the first fashion designers to build your digital presence on Fashion360.",
    cta: "Join Founding Designer Waitlist",
  },
];

export function ComingSoonSection() {
  const openWaitlist = useWaitlistDialog();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary to-secondary px-6 py-20 sm:py-28 lg:px-8 lg:py-32">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.15em] text-white uppercase backdrop-blur-sm">
            <Sparkles className="size-3.5 text-warning" />
            Fashion360 Is Coming
          </span>
          <h2 className="mt-5 font-display text-4xl leading-tight tracking-tight text-white sm:text-5xl">
            Be Among the First to Experience Fashion360.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {PATHS.map((path, i) => (
            <Reveal key={path.role} delay={0.1 + i * 0.08}>
              <div className="flex h-full flex-col rounded-3xl border border-white/20 bg-white/10 p-7 text-left backdrop-blur-md">
                <p className="text-xs font-semibold tracking-[0.15em] text-warning uppercase">{path.label}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/85">{path.blurb}</p>
                <Button
                  size="lg"
                  variant="outline-light"
                  className="mt-6 w-full justify-between"
                  onClick={() => openWaitlist(path.role)}
                >
                  {path.cta}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
