"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({
  placeholder = "Search...",
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-full border border-border bg-muted/60 pr-4 pl-9 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
        {...props}
      />
    </div>
  );
}
