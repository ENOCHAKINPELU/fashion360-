import { Search, MessagesSquare, Layers, EyeOff, FileQuestion, ShieldAlert } from "lucide-react";
import { SectionHeading } from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/motion/reveal";

// Pre-launch: framed in future tense throughout ("will let you", "is being
// built to") rather than present tense — nothing is live yet, and this
// section sits directly beneath the pre-launch hero, so it must stay
// consistent with that framing rather than implying an active marketplace.
const PROBLEMS = [
  {
    icon: Search,
    title: "Finding the right fashion designer is difficult",
    resolution: "Browse designers by specialty, location, and reputation, instead of asking around.",
  },
  {
    icon: MessagesSquare,
    title: "Explaining your vision and your measurements, again and again",
    resolution: "Share your vision and measurements once, and keep them on hand for every designer.",
  },
  {
    icon: Layers,
    title: "Everything scattered across WhatsApp, Instagram, and bank transfers",
    resolution: "One place for references, conversations, designs, payments, and order updates.",
  },
  {
    icon: EyeOff,
    title: "No visibility into production once you've paid",
    resolution: "A clear, trackable view of your order, from design to delivery.",
  },
  {
    icon: FileQuestion,
    title: "Not knowing what your outfit will look like before it's made",
    resolution: "See your design before it's made, and approve the real thing, not a guess.",
  },
  {
    icon: ShieldAlert,
    title: "Payment and trust can be difficult",
    resolution: "Payments verified before production starts, with a clear process if something goes wrong.",
  },
];

export function ProblemSection() {
  return (
    <section
      className="px-6 py-20 sm:py-24 lg:px-8 lg:py-28"
      style={{ backgroundColor: "var(--campaign-cream)" }}
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Why Fashion360"
          title="Fashion Shouldn't Be This Complicated."
          align="center"
          className="mx-auto"
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.05}>
              <div className="h-full -translate-y-0 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-md">
                <span className="inline-flex rounded-xl bg-accent-soft p-2.5 text-primary">
                  <item.icon className="size-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.resolution}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
