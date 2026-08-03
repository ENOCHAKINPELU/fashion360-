"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/shared/components/search-input";
import {
  DesignPreviewsFiltersPopover,
  type DesignPreviewFilters,
} from "@/features/design-studio/components/design-previews-filters-popover";

const SORT_OPTIONS = [
  { value: "updatedAt:desc", label: "Newest first" },
  { value: "updatedAt:asc", label: "Oldest first" },
  { value: "previewCode:asc", label: "Design ID" },
  { value: "revisionCount:desc", label: "Most Revisions" },
];

export function DesignPreviewsToolbar({
  search,
  filters,
  sort,
  customerId,
  orderId,
  onSearchChange,
  onFiltersChange,
  onSortChange,
}: {
  search: string;
  filters: DesignPreviewFilters;
  sort: string;
  customerId?: string;
  orderId?: string;
  onSearchChange: (value: string) => void;
  onFiltersChange: (filters: DesignPreviewFilters) => void;
  onSortChange: (sort: string) => void;
}) {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (localSearch !== search) onSearchChange(localSearch);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const newPreviewParams = new URLSearchParams();
  if (customerId) newPreviewParams.set("customerId", customerId);
  if (orderId) newPreviewParams.set("orderId", orderId);
  const newPreviewQuery = newPreviewParams.toString();
  const newPreviewHref = `/dashboard/3d-studio/new${newPreviewQuery ? `?${newPreviewQuery}` : ""}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search by design ID, order, or customer..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <DesignPreviewsFiltersPopover value={filters} onChange={onFiltersChange} />
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-[160px] gap-1.5">
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
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" className="gap-1.5">
          <Link href={newPreviewHref}>
            <Plus className="size-4" /> New Design Preview
          </Link>
        </Button>
      </div>
    </div>
  );
}
