import { ShieldCheck, Route, Truck, MessageCircleWarning, BadgeCheck } from "lucide-react";
import { SectionHeading } from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/motion/reveal";
import { PAYMENT_PROTECTION_STATEMENT } from "@/lib/payment-architecture";

const PROTECTIONS = [
  { icon: ShieldCheck, title: "Protected Marketplace Payments", description: "Every payment is verified directly with the provider before production can begin." },
  { icon: Route, title: "Transparent Order Tracking", description: "Follow your order through every stage, from design to delivery." },
  { icon: Truck, title: "Delivery Updates", description: "Know exactly where your order is, every step of the way." },
  { icon: MessageCircleWarning, title: "Dispute Support", description: "A clear process if something isn't right, you're never left guessing." },
  { icon: BadgeCheck, title: "Verified Reviews", description: "Every review will come from a real, verified order, never a fake one." },
];

// Copy here is deliberately written to never contradict
// PAYMENT_PROTECTION_STATEMENT (lib/payment-architecture.ts, established
// when the protected-payment system was built) — no "escrow" claim, since
// Fashion360's current payment providers don't support holding funds.
export function ProtectionSection() {
  return (
    <section id="protection" className="bg-muted-surface">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:px-8 lg:py-32">
        <SectionHeading eyebrow="Protected Marketplace Payments" title="Fashion Without the Guesswork." align="center" className="mx-auto" />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {PROTECTIONS.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-border bg-surface p-5 text-center sm:text-left">
                <span className="inline-flex rounded-xl bg-accent-soft p-2.5 text-primary">
                  <item.icon className="size-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
          {PAYMENT_PROTECTION_STATEMENT}
        </p>
      </div>
    </section>
  );
}
