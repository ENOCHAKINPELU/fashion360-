"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav-config";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-nav-config";

// `variant`, not a `navItems` prop carrying NavItem[] directly — see
// sidebar-nav.tsx's comment on why: NavItem.icon is a live component
// reference, and passing one across the Server-to-Client boundary as an
// explicit prop from a Server Component caller (Topbar, AdminTopbar) fails
// at runtime even though it type-checks. A string keeps the actual data
// inside this client module's own imports.
export function Breadcrumb({ variant = "dashboard" }: { variant?: "dashboard" | "admin" }) {
  const pathname = usePathname();
  const basePath = variant === "admin" ? "/admin" : "/dashboard";
  const navItems = variant === "admin" ? ADMIN_NAV_ITEMS : NAV_ITEMS;
  const baseSegment = basePath.replace(/^\//, "");

  function labelFor(segment: string) {
    const match = navItems.find((item) => item.href.endsWith(`/${segment}`));
    if (match) return match.label;
    return segment
      .split("-")
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join(" ");
  }

  const segments = pathname.split("/").filter(Boolean).filter((s) => s !== baseSegment);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href={basePath} className="flex items-center gap-1 transition-colors hover:text-foreground">
        <Home className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{labelFor(baseSegment) || "Home"}</span>
      </Link>
      {segments.map((segment, i) => {
        const href = `${basePath}/` + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        return (
          <span key={href} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5" aria-hidden="true" />
            {isLast ? (
              <span className="font-medium text-foreground" aria-current="page">
                {labelFor(segment)}
              </span>
            ) : (
              <Link href={href} className="transition-colors hover:text-foreground">
                {labelFor(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
