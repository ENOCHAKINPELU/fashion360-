"use client";

import { Search, Star, MessagesSquare, Eye, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FashionImage } from "@/shared/components/fashion-image";
import { SectionHeading } from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/motion/reveal";
import { useWaitlistDialog } from "@/features/landing/components/waitlist-dialog-provider";

const VALUE_PROPS = [
  { icon: Search, label: "Discover fashion professionals" },
  { icon: Star, label: "Find designers by reputation" },
  { icon: MessagesSquare, label: "Request a service and collaborate" },
  { icon: Eye, label: "Visualize your design before it's made" },
  { icon: ShieldCheck, label: "Pay securely" },
  { icon: Truck, label: "Track your order and keep your fashion history" },
];

export function ForCustomersSection() {
  const openWaitlist = useWaitlistDialog();

  return (
    <section id="for-customers" className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:px-8 lg:py-32">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <SectionHeading eyebrow="For Customers" title="Your Fashion Journey, Simplified." />
          <ul className="mt-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {VALUE_PROPS.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 text-sm text-foreground">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                  <item.icon className="size-4" strokeWidth={1.75} />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
          <Button size="lg" className="mt-8" onClick={() => openWaitlist("CUSTOMER")}>
            Join the Customer Waitlist
          </Button>
        </Reveal>

        <Reveal delay={0.1}>
          <FashionImage category="lifestyle" aspect="4/5" alt="A conceptual image representing the Fashion360 customer experience" />
        </Reveal>
      </div>
    </section>
  );
}
