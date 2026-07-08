import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Users,
  Ruler,
  CalendarCheck,
  Sparkles,
  Receipt,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Customer Management",
    description:
      "Profiles, preferences, order history, and measurements in one elegant record for every client.",
  },
  {
    icon: Ruler,
    title: "Digital Measurements",
    description:
      "Manual or AI-assisted measurement capture, with full history and instant reuse for new orders.",
  },
  {
    icon: CalendarCheck,
    title: "Appointments & Calendar",
    description:
      "Consultations, fittings, and pickups scheduled with automatic reminders and availability control.",
  },
  {
    icon: Sparkles,
    title: "Design & Approval Workflow",
    description:
      "From inspiration to production — track design approvals and lock in changes before they're made.",
  },
  {
    icon: Receipt,
    title: "Quotations & Invoices",
    description:
      "Professional, branded quotations and invoices with deposit tracking and PDF export.",
  },
  {
    icon: ShieldCheck,
    title: "Built for Multi-Tenant Trust",
    description:
      "Every business's customers, orders, and payments are strictly isolated — enforced server-side.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-display text-xl tracking-tight">Fashion360</span>
          <nav className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Start free</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <span className="inline-flex rounded-full bg-accent-soft px-4 py-1.5 text-xs font-medium tracking-wide text-accent uppercase">
            Fashion Business Management
          </span>
          <h1 className="font-display mt-6 text-4xl leading-tight text-foreground sm:text-5xl">
            Run your fashion house with the polish your clients expect.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            Fashion360 brings customers, measurements, orders, appointments, and payments
            into one premium, easy-to-use platform — built for designers, tailors, and
            bespoke fashion studios.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg">Create your business</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-accent-soft p-2.5 text-accent">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.description}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 text-sm text-muted">
          © {new Date().getFullYear()} Fashion360. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
