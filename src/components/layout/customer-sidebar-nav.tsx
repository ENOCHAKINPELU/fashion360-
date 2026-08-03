"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CUSTOMER_NAV_ITEMS } from "@/lib/customer-nav-config";
import { cn } from "@/lib/utils";

// Mirrors SidebarNav's structure exactly, but for CUSTOMER_NAV_ITEMS and
// the /account route prefix — kept as a separate component rather than
// parametrizing SidebarNav so the business sidebar (used everywhere in the
// existing dashboard) is never at risk of being touched.
export function CustomerSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin" aria-label="Primary">
      {CUSTOMER_NAV_ITEMS.map((item) => {
        const active = pathname === item.href || (item.href !== "/account" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition-colors",
              "hover:bg-sidebar-hover hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              active && "bg-primary text-white hover:bg-primary"
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
            {!item.implemented && (
              <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white/50 uppercase">
                Soon
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
