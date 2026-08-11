"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav-config";
import type { NavItem } from "@/types/nav";

// basePath/navItems default to the business dashboard's own values, so
// every existing call site (just Topbar today) keeps working unchanged;
// the admin shell is the first caller to pass different ones.
export function Breadcrumb({ basePath = "/dashboard", navItems = NAV_ITEMS }: { basePath?: string; navItems?: NavItem[] }) {
  const pathname = usePathname();
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
