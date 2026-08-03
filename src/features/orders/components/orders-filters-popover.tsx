"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  orderStatusOptions,
  orderPaymentStatusOptions,
  orderTypeOptions,
  orderPriorityOptions,
} from "@/lib/validations/order";
import type { OrderFilters } from "@/features/orders/types";

export type { OrderFilters };

export function OrdersFiltersPopover({
  value,
  onChange,
}: {
  value: OrderFilters;
  onChange: (filters: OrderFilters) => void;
}) {
  const [draft, setDraft] = useState<OrderFilters>(value);
  const [open, setOpen] = useState(false);

  const activeCount = [value.status, value.paymentStatus, value.orderType, value.priority, value.dateFrom, value.dateTo].filter(
    Boolean
  ).length;

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
              {orderStatusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Payment Status</Label>
          <Select
            value={draft.paymentStatus ?? "any"}
            onValueChange={(v) => setDraft((d) => ({ ...d, paymentStatus: v === "any" ? undefined : v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any payment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any payment status</SelectItem>
              {orderPaymentStatusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Order Type</Label>
          <Select
            value={draft.orderType ?? "any"}
            onValueChange={(v) => setDraft((d) => ({ ...d, orderType: v === "any" ? undefined : v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any type</SelectItem>
              {orderTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select
            value={draft.priority ?? "any"}
            onValueChange={(v) => setDraft((d) => ({ ...d, priority: v === "any" ? undefined : v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any priority</SelectItem>
              {orderPriorityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Created after</Label>
            <input
              type="date"
              value={draft.dateFrom ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value || undefined }))}
              className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Created before</Label>
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
