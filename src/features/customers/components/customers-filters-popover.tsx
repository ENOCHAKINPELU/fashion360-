"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { genderOptions, statusOptions } from "@/lib/validations/customer";

export interface CustomerFilters {
  status?: string;
  gender?: string;
  vip?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function CustomersFiltersPopover({
  value,
  onChange,
}: {
  value: CustomerFilters;
  onChange: (filters: CustomerFilters) => void;
}) {
  const [draft, setDraft] = useState<CustomerFilters>(value);
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
      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={draft.status ?? "any"} onValueChange={(v) => setDraft((d) => ({ ...d, status: v === "any" ? undefined : v }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any status</SelectItem>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select value={draft.gender ?? "any"} onValueChange={(v) => setDraft((d) => ({ ...d, gender: v === "any" ? undefined : v }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any gender</SelectItem>
              {genderOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>VIP</Label>
          <Select value={draft.vip ?? "any"} onValueChange={(v) => setDraft((d) => ({ ...d, vip: v === "any" ? undefined : v }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="true">VIP only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Added after</Label>
            <input
              type="date"
              value={draft.dateFrom ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value || undefined }))}
              className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Added before</Label>
            <input
              type="date"
              value={draft.dateTo ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value || undefined }))}
              className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm"
            />
          </div>
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
