"use client";

import {
  Search,
  ClipboardList,
  Eye,
  IdCard,
  ShieldCheck,
  Truck,
  Shirt,
  RotateCw,
  ZoomIn,
  CheckCircle2,
  Circle,
  RotateCcw,
} from "lucide-react";
import { SectionHeading } from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/motion/reveal";
import { TiltCard } from "@/shared/components/motion/tilt-card";
import { useWaitlistDialog } from "@/features/landing/components/waitlist-dialog-provider";
import { cn } from "@/lib/utils";

const ORDER_STAGES = ["Payment", "Design", "Approval", "Production", "Ready", "In Transit", "Delivered"];

// Every mockup here is clearly-labeled sample content — no real designer
// names, no real orders, no real reviews. This section exists specifically
// to show the PRODUCT, not photography, per the spec: once this exists, the
// Discovery/3D-preview/journey-timeline/wardrobe sections built earlier in
// isolation became redundant with it and were removed (see page.tsx).
export function ProductExperienceSection() {
  const openWaitlist = useWaitlistDialog();

  return (
    <section id="experience" className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:px-8 lg:py-32">
      <SectionHeading
        eyebrow="The Fashion360 Experience"
        title="Everything You Need for Your Fashion Journey."
        subtitle="A single place to discover designers, request a service, preview your design, manage your measurements, pay securely, and track your order, all built into one product."
        align="center"
        className="mx-auto"
      />

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Discover Designers */}
        <Reveal delay={0}>
          <MockupCard icon={Search} title="Discover Designers" caption="Browse by specialty, location, and reputation.">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5">
              <Search className="size-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Search designers...</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {["Specialty", "Location", "Rating"].map((f) => (
                <span key={f} className="rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-medium text-primary">
                  {f}
                </span>
              ))}
            </div>
            <div className="mt-2.5 space-y-1.5">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="size-4 shrink-0 rounded-full bg-muted" />
                  <span className="h-1.5 w-full rounded-full bg-muted" />
                </div>
              ))}
            </div>
            <span className="mt-1.5 block text-[9px] font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              View Profile →
            </span>
          </MockupCard>
        </Reveal>

        {/* 2. Fashion Service Request */}
        <Reveal delay={0.05}>
          <MockupCard icon={ClipboardList} title="Service Request" caption="Describe your vision, budget, and timeline.">
            <div className="space-y-1.5">
              <span className="inline-block rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-medium text-primary">Category: Bridal</span>
              <div className="space-y-1">
                <span className="block h-1.5 w-full rounded-full bg-muted" />
                <span className="block h-1.5 w-3/4 rounded-full bg-muted" />
              </div>
              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                <span>Budget</span>
                <span>Timeline</span>
              </div>
              <div className="h-1 rounded-full bg-muted">
                <div className="h-1 w-2/3 rounded-full bg-primary" />
              </div>
            </div>
          </MockupCard>
        </Reveal>

        {/* 3. Design Preview */}
        <Reveal delay={0.1}>
          <MockupCard
            icon={Eye}
            title="Design Preview"
            caption="See your design before it's made."
            onClick={() => openWaitlist("CUSTOMER")}
          >
            {/* View selector — mirrors the real preset tabs the in-app 3D
                viewer already uses, so this reads as an actual interface
                rather than a placeholder swatch. */}
            <div className="flex gap-1">
              {["Front", "Back", "Side"].map((view, i) => (
                <span
                  key={view}
                  className={`rounded-full px-1.5 py-0.5 text-[8px] font-medium ${i === 0 ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}
                >
                  {view}
                </span>
              ))}
            </div>
            <div className="relative mt-1.5 aspect-[4/3] overflow-hidden rounded-lg bg-gradient-to-br from-accent-soft via-muted to-secondary/15">
              <div className="absolute inset-0 scale-100 bg-gradient-to-br from-accent-soft via-muted to-secondary/15 transition-transform duration-500 group-hover:scale-110" />
              {/* A sketched garment silhouette — the actual "design" this
                  card is previewing, not just an empty color block. */}
              <svg viewBox="0 0 100 140" className="absolute inset-0 m-auto h-[85%] w-auto text-primary/70" fill="none">
                <path
                  d="M50,8 C45,8 40,12 38,18 L22,22 L15,48 L33,58 L18,132 L82,132 L67,58 L85,48 L78,22 L62,18 C60,12 55,8 50,8 Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M33,58 L67,58" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                <path d="M25,95 L75,95" stroke="currentColor" strokeWidth="1" opacity="0.25" strokeDasharray="3 3" />
              </svg>
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-60 transition-opacity duration-300 group-hover:opacity-100">
                <span className="flex size-5 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm">
                  <RotateCw className="size-2.5" />
                </span>
                <span className="flex size-5 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm">
                  <ZoomIn className="size-2.5" />
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[9px] font-medium text-success">
                <CheckCircle2 className="size-2.5" /> Ready for Review
              </span>
              <span className="text-[9px] font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">View Design</span>
            </div>
          </MockupCard>
        </Reveal>

        {/* 4. Digital Fashion Passport */}
        <Reveal delay={0.15}>
          <MockupCard icon={IdCard} title="Fashion Passport" caption="Your measurements and style, saved once.">
            <div className="grid grid-cols-3 gap-1">
              {["Bust", "Waist", "Hip"].map((m) => (
                <div key={m} className="rounded-md border border-border bg-surface px-1.5 py-1 text-center">
                  <p className="text-[8px] text-muted-foreground">{m}</p>
                  <p className="text-[9px] font-semibold text-foreground">--</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {["Bridal", "Minimalist"].map((tag) => (
                <span key={tag} className="rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-medium text-primary">
                  {tag}
                </span>
              ))}
            </div>
          </MockupCard>
        </Reveal>

        {/* 5. Secure Payment */}
        <Reveal delay={0.2}>
          <MockupCard icon={ShieldCheck} title="Secure Payment" caption="Verified with the provider before production starts.">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Order Total</span>
              <span className="font-semibold text-foreground">₦--,---</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-success-soft px-2 py-1.5">
              <ShieldCheck className="size-3 text-success" />
              <span className="text-[9px] font-medium text-success">Payment Verified</span>
            </div>
          </MockupCard>
        </Reveal>

        {/* 6. Order Tracking */}
        <Reveal delay={0.25}>
          <MockupCard icon={Truck} title="Order Tracking" caption="Payment to delivery, always visible.">
            <div className="space-y-1">
              {ORDER_STAGES.map((stage, i) => (
                <div key={stage} className="flex items-center gap-1.5">
                  {i < 2 ? (
                    <CheckCircle2 className="size-2.5 shrink-0 text-primary" />
                  ) : (
                    <Circle className="size-2.5 shrink-0 text-muted-foreground/40" />
                  )}
                  <span className={`text-[9px] ${i < 2 ? "font-medium text-foreground" : "text-muted-foreground"}`}>{stage}</span>
                </div>
              ))}
            </div>
          </MockupCard>
        </Reveal>

        {/* 7. Digital Wardrobe */}
        <Reveal delay={0.3}>
          <MockupCard icon={Shirt} title="Digital Wardrobe" caption="Every piece you make, ready to revisit.">
            <div className="grid grid-cols-2 gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-square rounded-md bg-gradient-to-br from-accent-soft via-muted to-secondary/15" />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[9px] font-medium text-primary">
              <RotateCcw className="size-2.5" /> Reorder
            </div>
          </MockupCard>
        </Reveal>
      </div>
    </section>
  );
}

function MockupCard({
  icon: Icon,
  title,
  caption,
  children,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  caption: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <TiltCard className="group h-full">
      <Wrapper
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={cn(
          "flex h-full w-full flex-col rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition-shadow duration-300 group-hover:border-primary/25 group-hover:shadow-lg",
          onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        )}
      >
        <span className="inline-flex w-fit rounded-lg bg-accent-soft p-2 text-primary">
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{caption}</p>
        <div className="mt-3 flex-1 rounded-xl bg-muted-surface p-2.5">{children}</div>
        <span className="mt-2 self-start text-[9px] font-medium tracking-wide text-muted-foreground uppercase">Product Preview</span>
      </Wrapper>
    </TiltCard>
  );
}
