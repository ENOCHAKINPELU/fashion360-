"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowUpDown, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/shared/components/search-input";
import { DesignFiltersPopover } from "@/features/design-gallery/components/design-filters-popover";
import type { DesignFilters, DesignCategoryOption, DesignCollectionOption } from "@/features/design-gallery/types";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "name:asc", label: "Name (A–Z)" },
  { value: "popular:desc", label: "Most popular" },
  { value: "basePrice:asc", label: "Price (low–high)" },
  { value: "basePrice:desc", label: "Price (high–low)" },
];

export function DesignGalleryToolbar({
  search,
  filters,
  sort,
  view,
  categories,
  collections,
  onSearchChange,
  onFiltersChange,
  onSortChange,
  onViewChange,
  onAddDesign,
}: {
  search: string;
  filters: DesignFilters;
  sort: string;
  view: "grid" | "list";
  categories: DesignCategoryOption[];
  collections: DesignCollectionOption[];
  onSearchChange: (value: string) => void;
  onFiltersChange: (filters: DesignFilters) => void;
  onSortChange: (sort: string) => void;
  onViewChange: (view: "grid" | "list") => void;
  onAddDesign: () => void;
}) {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (localSearch !== search) onSearchChange(localSearch);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search designs, tags, occasions..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <DesignFiltersPopover value={filters} onChange={onFiltersChange} categories={categories} collections={collections} />
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-[170px] gap-1.5">
            <ArrowUpDown className="size-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => onViewChange("grid")}
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-colors",
              view === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
            )}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("list")}
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-colors",
              view === "list" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
            )}
            aria-label="List view"
            aria-pressed={view === "list"}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>
      <Button size="sm" onClick={onAddDesign} className="gap-1.5">
        <Plus className="size-4" /> Add Design
      </Button>
    </div>
  );
}
