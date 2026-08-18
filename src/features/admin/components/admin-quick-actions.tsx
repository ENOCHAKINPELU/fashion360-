import Link from "next/link";
import { ShieldCheck, ShoppingBag, Users, CreditCard, Truck, Star, Bell } from "lucide-react";

// Plain Server Component — every icon here is a local import used directly
// in this file's own JSX, never received as a prop from a parent (that's
// the pattern that broke every /admin/* page once already; see
// sidebar-nav.tsx's comment for the full incident).
const ACTIONS = [
  { label: "Verify Designers", href: "/admin/verifications", icon: ShieldCheck },
  { label: "View Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Manage Customers", href: "/admin/customers", icon: Users },
  { label: "View Payments", href: "/admin/transactions", icon: CreditCard },
  { label: "Review Deliveries", href: "/admin/deliveries", icon: Truck },
  { label: "Manage Reviews", href: "/admin/reviews", icon: Star },
  { label: "View Notifications", href: "/admin/notifications", icon: Bell },
] as const;

export function AdminQuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-accent-soft"
        >
          <action.icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
