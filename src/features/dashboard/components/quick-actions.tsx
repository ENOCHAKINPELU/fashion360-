import Link from "next/link";
import { UserPlus, ShoppingBag, CalendarPlus, FileText } from "lucide-react";

const ACTIONS = [
  { label: "Add Customer", href: "/dashboard/customers", icon: UserPlus },
  { label: "New Order", href: "/dashboard/orders", icon: ShoppingBag },
  { label: "Book Appointment", href: "/dashboard/appointments", icon: CalendarPlus },
  { label: "Create Quotation", href: "/dashboard/quotations", icon: FileText },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ACTIONS.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="flex flex-col items-start gap-2.5 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-accent-soft/50"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-primary">
            <action.icon className="size-4.5" aria-hidden="true" />
          </div>
          <span className="text-sm font-medium text-foreground">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
