"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/businesses", label: "Businesses" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/verifications", label: "Verifications" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 pt-1">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-accent-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
