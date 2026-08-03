"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { WEEKDAYS } from "@/lib/validations/business";

type WorkingHours = Record<string, { open: string; close: string; closed: boolean }>;

const DEFAULT_HOURS: WorkingHours = Object.fromEntries(
  WEEKDAYS.map((day) => [day, { open: "09:00", close: "18:00", closed: day === "sunday" }])
) as WorkingHours;

export function BrandHoursForm({
  defaultBrandColors,
  defaultWorkingHours,
}: {
  defaultBrandColors?: { primary?: string; secondary?: string };
  defaultWorkingHours?: WorkingHours;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [primary, setPrimary] = useState(defaultBrandColors?.primary ?? "#6C3CF0");
  const [secondary, setSecondary] = useState(defaultBrandColors?.secondary ?? "#8E63FF");
  const [hours, setHours] = useState<WorkingHours>({ ...DEFAULT_HOURS, ...defaultWorkingHours });

  function updateDay(day: string, patch: Partial<WorkingHours[string]>) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandColors: { primary, secondary },
          workingHours: hours,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      toast.success("Brand and hours updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <Label className="mb-3 block">Brand Colors</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField label="Primary color" value={primary} onChange={setPrimary} />
          <ColorField label="Secondary color" value={secondary} onChange={setSecondary} />
        </div>
      </div>

      <div>
        <Label className="mb-3 block">Business Hours</Label>
        <div className="space-y-2 rounded-xl border border-border p-4">
          {WEEKDAYS.map((day) => (
            <div key={day} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-1.5">
              <span className="text-sm font-medium capitalize text-foreground">{day}</span>
              <input
                type="time"
                value={hours[day]?.open ?? "09:00"}
                disabled={hours[day]?.closed}
                onChange={(e) => updateDay(day, { open: e.target.value })}
                className="rounded-lg border border-border bg-surface px-2 py-1 text-sm disabled:opacity-50"
              />
              <input
                type="time"
                value={hours[day]?.close ?? "18:00"}
                disabled={hours[day]?.closed}
                onChange={(e) => updateDay(day, { close: e.target.value })}
                className="rounded-lg border border-border bg-surface px-2 py-1 text-sm disabled:opacity-50"
              />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox
                  checked={hours[day]?.closed ?? false}
                  onCheckedChange={(checked) => updateDay(day, { closed: checked === true })}
                />
                Closed
              </label>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm uppercase outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
        />
      </div>
    </div>
  );
}
