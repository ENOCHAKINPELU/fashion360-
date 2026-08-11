"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/nav";

// items/homeHref default to the business dashboard's own values, so the
// existing call site (Sidebar/MobileSidebar) keeps working unchanged; the
// admin shell is the first caller to pass its own nav list.
export function SidebarNav({ items = NAV_ITEMS, homeHref = "/dashboard", onNavigate }: { items?: NavItem[]; homeHref?: string; onNavigate?: () => void }) {
  const pathname = usePathname();

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
