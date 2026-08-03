"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { designPreviewStatusOptions } from "@/lib/validations/design-preview";

export interface DesignPreviewFilters {
  status?: string;
}

export function DesignPreviewsFiltersPopover({
  value,
  onChange,
}: {
  value: DesignPreviewFilters;
  onChange: (filters: DesignPreviewFilters) => void;
}) {
  const [draft, setDraft] = useState<DesignPreviewFilters>(value);
  const [open, setOpen] = useState(false);

  const activeCount = [value.status].filter(Boolean).length;

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
          <Select
            value={draft.status ?? "any"}
            onValueChange={(v) => setDraft((d) => ({ ...d, status: v === "any" ? undefined : v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any status</SelectItem>
              {designPreviewStatusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
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
