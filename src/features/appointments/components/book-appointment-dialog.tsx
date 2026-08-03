"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AppointmentTypeOption {
  id: string;
  name: string;
  defaultDurationMinutes: number;
  category: string;
}

// Part 6/7: reused from a Business Profile, a Connected Business, or a
// Service Request (via the `serviceRequestId` prop, which the API
// auto-associates with the resulting appointment).
export function BookAppointmentDialog({
  businessId,
  businessName,
  serviceRequestId,
  trigger,
  onBooked,
}: {
  businessId: string;
  businessName: string;
  serviceRequestId?: string;
  trigger?: React.ReactNode;
  onBooked?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "summary">("form");
  const [types, setTypes] = useState<AppointmentTypeOption[]>([]);
  const [typeId, setTypeId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<{ start: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/customer/appointments/types?businessId=${businessId}`)
      .then((r) => r.json())
      .then((d) => setTypes(d.types ?? []));
  }, [open, businessId]);

  useEffect(() => {
    if (!date || !typeId) {
      setSlots([]);
      return;
    }
    const duration = types.find((t) => t.id === typeId)?.defaultDurationMinutes ?? 60;
    setLoadingSlots(true);
    fetch(`/api/customer/appointments/slots?businessId=${businessId}&date=${date}&durationMinutes=${duration}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [date, typeId, businessId, types]);

  function reset() {
    setStep("form");
    setTypeId("");
    setDate("");
    setTime("");
    setLocation("");
    setNotes("");
  }

  const selectedType = types.find((t) => t.id === typeId);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          typeId,
          serviceRequestId,
          date,
          time,
          durationMinutes: selectedType?.defaultDurationMinutes ?? 60,
          location: location || undefined,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not book appointment");
      toast.success("Appointment requested, pending confirmation");
      setOpen(false);
      reset();
      onBooked?.();
      router.push("/account/appointments");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not book appointment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button className="w-full gap-1.5" onClick={() => setOpen(true)}>
          <CalendarClock className="size-4" /> Book Consultation
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{step === "form" ? `Book an Appointment with ${businessName}` : "Confirm Appointment"}</DialogTitle>
            <DialogDescription>
              {step === "form" ? "Choose a type, date, and time that works for you." : "Review the details before sending your request."}
            </DialogDescription>
          </DialogHeader>

          {step === "form" ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Appointment Type</Label>
                <Select value={typeId} onValueChange={setTypeId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.defaultDurationMinutes}m)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              {date && typeId && (
                <div className="space-y-1.5">
                  <Label>Available Times</Label>
                  {loadingSlots ? (
                    <p className="text-xs text-muted-foreground">Loading times…</p>
                  ) : slots.filter((s) => s.available).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No times available on this date, try another day.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slots
                        .filter((s) => s.available)
                        .map((s) => {
                          const t = new Date(s.start);
                          const label = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          const value = t.toTimeString().slice(0, 5);
                          return (
                            <button
                              key={s.start}
                              type="button"
                              onClick={() => setTime(value)}
                              className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                                time === value ? "border-primary bg-accent-soft text-primary" : "border-border text-foreground hover:bg-muted"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Location (optional)</Label>
                <Input placeholder="e.g. In-person at their studio" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground uppercase">Business</p>
                <p className="font-medium text-foreground">{businessName}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground uppercase">Appointment</p>
                <p className="font-medium text-foreground">{selectedType?.name}</p>
                <p className="text-foreground">
                  {date} at {time}
                </p>
              </div>
              {location && (
                <div className="rounded-xl border border-border bg-surface p-3">
                  <p className="text-xs text-muted-foreground uppercase">Location</p>
                  <p className="text-foreground">{location}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {step === "form" ? (
              <Button className="w-full" disabled={!typeId || !date || !time} onClick={() => setStep("summary")}>
                Review
              </Button>
            ) : (
              <div className="flex w-full gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("form")} disabled={submitting}>
                  Back
                </Button>
                <Button className="flex-1" onClick={submit} disabled={submitting}>
                  {submitting ? "Booking..." : "Confirm Appointment"}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
