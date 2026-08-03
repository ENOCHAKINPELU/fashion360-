"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { serviceCategoryOptions } from "@/lib/validations/service";

export interface DiscoverFilters {
  location?: string;
  specialty?: string;
  category?: string;
  verified?: string;
  available?: string;
  priceMin?: string;
  priceMax?: string;
  minRating?: string;
  verifiedReviews?: string;
  topRated?: string;
  reliableDelivery?: string;
  fastResponse?: string;
  newDesigners?: string;
  popularDesigners?: string;
}

const CATEGORY_LABELS = Object.fromEntries(serviceCategoryOptions.map((o) => [o.value, o.label]));

// Part 5/22: locations and specialties come from what's actually in use
// among discoverable businesses (passed in via `options`, computed
// server-side), not a hardcoded catalog. The trust-signal filters
// (Part 22) map directly onto real BusinessRating/TrustBadgeAssignment
// data — never a hand-typed business claim.
export function DiscoverFiltersPopover({
  filters,
  options,
  activeCount,
  onChange,
}: {
  filters: DiscoverFilters;
  options: { locations: string[]; specialties: string[]; categories: string[] };
  activeCount: number;
  onChange: (filters: DiscoverFilters) => void;
}) {
  const [draft, setDraft] = useState<DiscoverFilters>(filters);
  const [open, setOpen] = useState(false);

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
        if (next) setDraft(filters);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal className="size-4" />
          Filters
          {activeCount > 0 && <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-white">{activeCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        {options.locations.length > 0 && (
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select value={draft.location ?? "any"} onValueChange={(v) => setDraft((d) => ({ ...d, location: v === "any" ? undefined : v }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any location</SelectItem>
                {options.locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {options.specialties.length > 0 && (
          <div className="space-y-1.5">
            <Label>Specialty</Label>
            <Select value={draft.specialty ?? "any"} onValueChange={(v) => setDraft((d) => ({ ...d, specialty: v === "any" ? undefined : v }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any specialty</SelectItem>
                {options.specialties.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {options.categories.length > 0 && (
          <div className="space-y-1.5">
            <Label>Service Category</Label>
            <Select value={draft.category ?? "any"} onValueChange={(v) => setDraft((d) => ({ ...d, category: v === "any" ? undefined : v }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any category</SelectItem>
                {options.categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c] ?? c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Min Price</Label>
            <Input
              type="number"
              min={0}
              value={draft.priceMin ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, priceMin: e.target.value || undefined }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max Price</Label>
            <Input
              type="number"
              min={0}
              value={draft.priceMax ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, priceMax: e.target.value || undefined }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Minimum Rating</Label>
          <Select value={draft.minRating ?? "any"} onValueChange={(v) => setDraft((d) => ({ ...d, minRating: v === "any" ? undefined : v }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any rating</SelectItem>
              <SelectItem value="4.5">4.5★ &amp; up</SelectItem>
              <SelectItem value="4">4★ &amp; up</SelectItem>
              <SelectItem value="3">3★ &amp; up</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={draft.verified === "true"} onCheckedChange={(v) => setDraft((d) => ({ ...d, verified: v === true ? "true" : undefined }))} />
          Verified businesses only
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={draft.available === "true"} onCheckedChange={(v) => setDraft((d) => ({ ...d, available: v === true ? "true" : undefined }))} />
          Currently accepting requests
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={draft.verifiedReviews === "true"}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, verifiedReviews: v === true ? "true" : undefined }))}
          />
          Has verified reviews
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={draft.topRated === "true"} onCheckedChange={(v) => setDraft((d) => ({ ...d, topRated: v === true ? "true" : undefined }))} />
          Top Rated
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={draft.reliableDelivery === "true"}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, reliableDelivery: v === true ? "true" : undefined }))}
          />
          Reliable Delivery
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={draft.fastResponse === "true"}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, fastResponse: v === true ? "true" : undefined }))}
          />
          Fast Responder
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={draft.newDesigners === "true"}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, newDesigners: v === true ? "true" : undefined }))}
          />
          New Designers
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={draft.popularDesigners === "true"}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, popularDesigners: v === true ? "true" : undefined }))}
          />
          Popular Designers
        </label>

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
