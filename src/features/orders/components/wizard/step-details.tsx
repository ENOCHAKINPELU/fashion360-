"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/shared/components/user-avatar";
import { orderTypeOptions, orderPriorityOptions, deliveryMethodOptions } from "@/lib/validations/order";
import type { OrderUserOption } from "@/features/orders/types";

export interface DetailsState {
  orderType: string;
  priority: string;
  orderDate: string;
  expectedCompletionDate: string;
  eventDate: string;
  occasion: string;
  deliveryMethod: string;
  deliveryAddress: string;
  customerNotes: string;
  designerNotes: string;
  privateNotes: string;
  assignedDesignerId: string;
}

export function StepDetails({
  state,
  onChange,
}: {
  state: DetailsState;
  onChange: (patch: Partial<DetailsState>) => void;
}) {
  const [staff, setStaff] = useState<OrderUserOption[]>([]);

  useEffect(() => {
    fetch("/api/staff")
      .then((res) => res.json())
      .then((data) => setStaff(data.staff ?? []))
      .catch(() => setStaff([]));
  }, []);

  const completionError =
    state.expectedCompletionDate &&
    state.orderDate &&
    state.expectedCompletionDate < state.orderDate
      ? "Expected completion date cannot be before the order date"
      : undefined;

  const eventDateError =
    state.eventDate && state.orderDate && state.eventDate < state.orderDate
      ? "Event date cannot be before the order date"
      : undefined;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Order Details</h2>
        <p className="text-sm text-muted-foreground">
          Timing, priority, delivery, and internal notes for this order.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Order Type</Label>
          <Select value={state.orderType} onValueChange={(v) => onChange({ orderType: v })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select order type" />
            </SelectTrigger>
            <SelectContent>
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
          <Select value={state.priority} onValueChange={(v) => onChange({ priority: v })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {orderPriorityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Order Date</Label>
          <Input
            type="date"
            value={state.orderDate}
            onChange={(e) => onChange({ orderDate: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Expected Completion Date</Label>
          <Input
            type="date"
            value={state.expectedCompletionDate}
            onChange={(e) => onChange({ expectedCompletionDate: e.target.value })}
          />
          {completionError && <p className="text-xs text-danger">{completionError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Event Date</Label>
          <Input type="date" value={state.eventDate} onChange={(e) => onChange({ eventDate: e.target.value })} />
          {eventDateError && <p className="text-xs text-danger">{eventDateError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Occasion</Label>
          <Input
            value={state.occasion}
            onChange={(e) => onChange({ occasion: e.target.value })}
            placeholder="e.g. Wedding, Birthday"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Delivery Method</Label>
          <Select value={state.deliveryMethod} onValueChange={(v) => onChange({ deliveryMethod: v })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select delivery method" />
            </SelectTrigger>
            <SelectContent>
              {deliveryMethodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {state.deliveryMethod === "DELIVERY" && (
          <div className="space-y-1.5">
            <Label>
              Delivery Address <span className="text-danger">*</span>
            </Label>
            <Input
              value={state.deliveryAddress}
              onChange={(e) => onChange({ deliveryAddress: e.target.value })}
              placeholder="Street, city, state"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Assigned Designer</Label>
          <Select
            value={state.assignedDesignerId || "none"}
            onValueChange={(v) => onChange({ assignedDesignerId: v === "none" ? "" : v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select designer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {staff.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <span className="flex items-center gap-2">
                    <UserAvatar name={member.name} image={member.image} className="size-5" />
                    {member.name ?? "Unnamed"}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Customer Notes</Label>
        <Textarea
          rows={3}
          value={state.customerNotes}
          onChange={(e) => onChange({ customerNotes: e.target.value })}
          placeholder="Notes visible to the customer..."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Designer Notes</Label>
        <Textarea
          rows={3}
          value={state.designerNotes}
          onChange={(e) => onChange({ designerNotes: e.target.value })}
          placeholder="Notes for the assigned designer / production team..."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Private Notes</Label>
        <p className="text-xs text-muted-foreground">Only visible to your team.</p>
        <Textarea
          rows={3}
          value={state.privateNotes}
          onChange={(e) => onChange({ privateNotes: e.target.value })}
          placeholder="Internal-only notes..."
        />
      </div>
    </div>
  );
}
