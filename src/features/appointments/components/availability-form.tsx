"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export interface AvailabilityValue {
  breakStart: string | null;
  breakEnd: string | null;
  slotIntervalMinutes: number;
  bufferMinutes: number;
  maxDailyAppointments: number | null;
  vacationMode: boolean;
  vacationStart: string | null;
  vacationEnd: string | null;
  vacationMessage: string | null;
}

export function AvailabilityForm({ availability }: { availability: AvailabilityValue }) {
  const router = useRouter();
  const [breakStart, setBreakStart] = useState(availability.breakStart ?? "");
  const [breakEnd, setBreakEnd] = useState(availability.breakEnd ?? "");
  const [slotInterval, setSlotInterval] = useState(availability.slotIntervalMinutes);
  const [buffer, setBuffer] = useState(availability.bufferMinutes);
  const [maxDaily, setMaxDaily] = useState(availability.maxDailyAppointments?.toString() ?? "");
  const [vacationMode, setVacationMode] = useState(availability.vacationMode);
  const [vacationStart, setVacationStart] = useState(availability.vacationStart?.slice(0, 10) ?? "");
  const [vacationEnd, setVacationEnd] = useState(availability.vacationEnd?.slice(0, 10) ?? "");
  const [vacationMessage, setVacationMessage] = useState(availability.vacationMessage ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          breakStart,
          breakEnd,
          slotIntervalMinutes: slotInterval,
          bufferMinutes: buffer,
          maxDailyAppointments: maxDaily ? Number(maxDaily) : null,
          vacationMode,
          vacationStart,
          vacationEnd,
          vacationMessage,
        }),
      });
      if (!res.ok) throw new Error("Could not save availability settings");
      toast.success("Availability settings saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-3 block">Break Time</Label>
        <div className="grid grid-cols-2 gap-3 sm:w-80">
          <Input type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} />
          <Input type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Applied every working day. Leave blank for no break.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Slot Interval (minutes)</Label>
          <Input type="number" min={5} step={5} value={slotInterval} onChange={(e) => setSlotInterval(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Appointment Buffer (minutes)</Label>
          <Input type="number" min={0} step={5} value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Maximum Daily Appointments</Label>
          <Input type="number" min={1} placeholder="Unlimited" value={maxDaily} onChange={(e) => setMaxDaily(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Vacation Mode</p>
            <p className="text-xs text-muted-foreground">Block all new bookings during a date range.</p>
          </div>
          <Switch checked={vacationMode} onCheckedChange={setVacationMode} />
        </div>
        {vacationMode && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input type="date" value={vacationStart} onChange={(e) => setVacationStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input type="date" value={vacationEnd} onChange={(e) => setVacationEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Message to customers</Label>
              <Textarea rows={2} value={vacationMessage} onChange={(e) => setVacationMessage(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save Availability Settings"}
      </Button>
    </div>
  );
}
