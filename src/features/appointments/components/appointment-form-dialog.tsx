"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerPicker } from "@/shared/components/customer-picker";
import {
  statusOptions,
  reminderOffsetOptions,
  reminderChannelOptions,
} from "@/lib/validations/appointment";

interface AppointmentTypeOption {
  id: string;
  name: string;
  color: string;
  defaultDurationMinutes: number;
}
interface StaffOption {
  id: string;
  name: string | null;
  position: string | null;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  prefilledCustomer,
  defaultDate,
  defaultStatus,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledCustomer?: { id: string; firstName: string; lastName: string; phone: string | null; profilePhotoUrl: string | null };
  defaultDate?: Date;
  defaultStatus?: string;
  onSaved?: (appointmentId: string) => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [types, setTypes] = useState<AppointmentTypeOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  const [customerId, setCustomerId] = useState<string | undefined>(prefilledCustomer?.id);
  const [newCustomer, setNewCustomer] = useState<{ firstName: string; lastName: string; email: string; phone: string } | undefined>();
  const [typeId, setTypeId] = useState("");
  const [date, setDate] = useState(() => (defaultDate ?? new Date()).toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [assignedStaffId, setAssignedStaffId] = useState<string>("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("SCHEDULED");
  const [channels, setChannels] = useState<string[]>(["EMAIL"]);
  const [offsets, setOffsets] = useState<number[]>([1440, 120]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [occurrences, setOccurrences] = useState(4);

  // Reset the form fields whenever the dialog transitions from closed to
  // open (the instance is reused across multiple opens with new defaults).
  // Adjusting state during render — not in an effect — is the pattern React
  // recommends for this; it avoids an extra render pass.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setCustomerId(prefilledCustomer?.id);
    setNewCustomer(undefined);
    const now = defaultDate ?? new Date();
    setDate(now.toISOString().slice(0, 10));
    if (defaultDate) setTime(now.toTimeString().slice(0, 5));
    if (defaultStatus) setStatus(defaultStatus);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    fetch("/api/appointments/types")
      .then((res) => res.json())
      .then((data) => {
        setTypes(data.types ?? []);
        if (data.types?.[0]) {
          setTypeId(data.types[0].id);
          setDuration(data.types[0].defaultDurationMinutes);
        }
      });
    fetch("/api/staff")
      .then((res) => res.json())
      .then((data) => setStaff(data.staff ?? []));
  }, [open]);

  function toggleFromArray<T>(arr: T[], value: T, setter: (v: T[]) => void) {
    setter(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  }

  function selectType(id: string) {
    setTypeId(id);
    const type = types.find((t) => t.id === id);
    if (type) setDuration(type.defaultDurationMinutes);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        customerId,
        newCustomer: !customerId && newCustomer ? { ...newCustomer, email: newCustomer.email || undefined } : undefined,
        typeId,
        date,
        time,
        durationMinutes: duration,
        assignedStaffId: assignedStaffId || undefined,
        location: location || undefined,
        notes: notes || undefined,
        reminderChannels: channels,
        reminderOffsets: offsets,
        status,
        recurrence: isRecurring ? { frequency, occurrences } : undefined,
      };

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not create appointment");

      toast.success("Appointment created");
      onOpenChange(false);
      onSaved?.(json.appointments?.[0]?.appointmentId);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
          <DialogDescription>Schedule a consultation, fitting, or other appointment.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="mb-2 block">Customer</Label>
            <CustomerPicker
              customerId={customerId}
              onSelectCustomer={(c) => setCustomerId(c?.id)}
              newCustomer={newCustomer}
              onNewCustomerChange={setNewCustomer}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Appointment Type</Label>
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <button
                  type="button"
                  key={type.id}
                  onClick={() => selectType(type.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    typeId === type.id ? "border-primary bg-accent-soft text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: type.color }} />
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Assigned Designer</Label>
              <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.position ? `(${s.position})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Meeting Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="In-studio, Virtual..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="space-y-2 rounded-xl border border-border p-4">
            <Label>Reminder Preference</Label>
            <div className="flex flex-wrap gap-3">
              {reminderChannelOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Checkbox
                    checked={channels.includes(opt.value)}
                    onCheckedChange={() => toggleFromArray(channels, opt.value, setChannels)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 border-t border-border pt-2">
              {reminderOffsetOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Checkbox
                    checked={offsets.includes(opt.value)}
                    onCheckedChange={() => toggleFromArray(offsets, opt.value, setOffsets)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Recurring Appointment</p>
                <p className="text-xs text-muted-foreground">Repeat this appointment on a schedule.</p>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
            {isRecurring && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Occurrences</Label>
                  <Input type="number" min={2} max={52} value={occurrences} onChange={(e) => setOccurrences(Number(e.target.value))} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !typeId}>
              {submitting ? "Saving..." : "Save Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
