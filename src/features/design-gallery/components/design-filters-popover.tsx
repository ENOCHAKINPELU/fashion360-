"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { designStatusOptions, designDifficultyOptions } from "@/lib/validations/design";
import type { DesignFilters, DesignCategoryOption, DesignCollectionOption } from "@/features/design-gallery/types";

export function DesignFiltersPopover({
  value,
  onChange,
  categories,
  collections,
}: {
  value: DesignFilters;
  onChange: (filters: DesignFilters) => void;
  categories: DesignCategoryOption[];
  collections: DesignCollectionOption[];
}) {
  const [draft, setDraft] = useState<DesignFilters>(value);
  const [open, setOpen] = useState(false);

  const activeCount = Object.values(value).filter(Boolean).length;

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  function clear() {
    setDraft({});
    onChange({});
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal className="size-4" />
          Filter
          {activeCount > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-white">{activeCount}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={draft.categoryId ?? "any"}
            onValueChange={(v) => setDraft((d) => ({ ...d, categoryId: v === "any" ? undefined : v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any category</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Collection</Label>
          <Select
            value={draft.collectionId ?? "any"}
            onValueChange={(v) => setDraft((d) => ({ ...d, collectionId: v === "any" ? undefined : v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any collection</SelectItem>
              {collections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={draft.status ?? "any"}
              onValueChange={(v) => setDraft((d) => ({ ...d, status: v === "any" ? undefined : v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any status</SelectItem>
                {designStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select
              value={draft.difficulty ?? "any"}
              onValueChange={(v) => setDraft((d) => ({ ...d, difficulty: v === "any" ? undefined : v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any difficulty</SelectItem>
                {designDifficultyOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Min price</Label>
            <Input
              type="number"
              min={0}
              value={draft.minPrice ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value || undefined }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max price</Label>
            <Input
              type="number"
              min={0}
              value={draft.maxPrice ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value || undefined }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Featured</Label>
          <Select
            value={draft.featured ?? "any"}
            onValueChange={(v) => setDraft((d) => ({ ...d, featured: v === "any" ? undefined : v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="true">Featured only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
          <Button size="sm" onClick={apply}>
            Apply filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
