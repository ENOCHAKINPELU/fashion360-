"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/shared/components/user-avatar";
import type { DesignCustomerOption } from "@/features/design-gallery/types";

export function DesignCustomerSelect({
  selected,
  onSelect,
}: {
  selected: DesignCustomerOption | null;
  onSelect: (customer: DesignCustomerOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DesignCustomerOption[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      setSearching(true);
      fetch(`/api/customers?search=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => setResults(data.customers ?? []))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border p-3">
        <UserAvatar name={`${selected.firstName} ${selected.lastName}`} image={selected.profilePhotoUrl} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {selected.firstName} {selected.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{selected.phone ?? selected.email ?? "N/A"}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onSelect(null)}>
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search customer by name or phone..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-9"
      />
      {(results.length > 0 || searching) && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
          {searching && <p className="p-3 text-xs text-muted-foreground">Searching...</p>}
          {results.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => {
                onSelect(c);
                setQuery("");
                setResults([]);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <UserAvatar name={`${c.firstName} ${c.lastName}`} image={c.profilePhotoUrl} className="size-7" />
              <span>
                {c.firstName} {c.lastName}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">{c.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
