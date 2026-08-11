"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav-config";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-nav-config";
import { cn } from "@/lib/utils";

// `variant`, not an `items` prop carrying NavItem[] directly: NavItem.icon
// is a live component reference (a Lucide icon), and Sidebar/AdminSidebar
// are Server Components — passing an array of those across the Server-to-
// Client boundary as a prop fails at runtime ("Functions cannot be passed
// directly to Client Components"), even though it type-checks fine. A
// string discriminator keeps the actual icon-bearing data inside this
// client module's own imports instead, which is a value both possible
// Server Component callers (Sidebar, AdminSidebar) can pass safely.
export function SidebarNav({ variant = "dashboard", onNavigate }: { variant?: "dashboard" | "admin"; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = variant === "admin" ? ADMIN_NAV_ITEMS : NAV_ITEMS;
  const homeHref = variant === "admin" ? "/admin" : "/dashboard";

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin" aria-label="Primary">
      {items.map((item, index) => {
        const active = pathname === item.href || (item.href !== homeHref && pathname.startsWith(item.href));
        const Icon = item.icon;
        const showGroupLabel = item.group !== items[index - 1]?.group;
        return (
          <div key={item.href}>
            {showGroupLabel && item.group && (
              <p className="mt-4 mb-1 px-3 text-[11px] font-semibold tracking-wide text-white/35 uppercase first:mt-2">{item.group}</p>
            )}
            <Link
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
          </div>
        );
      })}
    </nav>
  );
}
