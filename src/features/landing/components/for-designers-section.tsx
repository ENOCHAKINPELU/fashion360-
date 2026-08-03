"use client";

import { UserCircle, GalleryHorizontalEnd, Search, ClipboardList, MessagesSquare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FashionImage } from "@/shared/components/fashion-image";
import { SectionHeading } from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/motion/reveal";
import { useWaitlistDialog } from "@/features/landing/components/waitlist-dialog-provider";

const VALUE_PROPS = [
  { icon: UserCircle, label: "Build your professional profile" },
  { icon: GalleryHorizontalEnd, label: "Showcase your portfolio" },
  { icon: Search, label: "Get discovered by real customers" },
  { icon: ClipboardList, label: "Manage customer orders end-to-end" },
  { icon: MessagesSquare, label: "Collaborate directly with customers" },
  { icon: TrendingUp, label: "Grow your reputation and revenue" },
];

export function ForDesignersSection() {
  const openWaitlist = useWaitlistDialog();

  return (
    <section id="for-designers" className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:px-8 lg:py-32">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className="order-2 lg:order-1">
          <FashionImage category="product" aspect="4/5" alt="A fashion designer sketching a new garment design" />
        </Reveal>

        <Reveal delay={0.1} className="order-1 lg:order-2">
          <SectionHeading eyebrow="Founding Designers" title="Turn Your Craft Into a Digital Fashion Business." />
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
          <Button size="lg" className="mt-8" onClick={() => openWaitlist("DESIGNER")}>
            Join as a Founding Designer
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
