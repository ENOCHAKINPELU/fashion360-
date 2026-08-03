"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TERMINAL = new Set(["COMPLETED", "CANCELLED", "NO_SHOW", "EXPIRED", "DECLINED"]);

export function CustomerAppointmentActions({ appointmentId, status }: { appointmentId: string; status: string }) {
  const router = useRouter();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (TERMINAL.has(status) || status === "RESCHEDULE_REQUESTED") {
    if (status === "RESCHEDULE_REQUESTED") {
      return <p className="text-sm text-muted-foreground">Waiting on a response to your reschedule request.</p>;
    }
    return null;
  }

  async function cancel() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/appointments/${appointmentId}/cancel`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not cancel appointment");
      toast.success("Appointment cancelled");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel appointment");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestReschedule() {
    if (!date || !time) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/appointments/${appointmentId}/reschedule-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, reason: reason || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not request reschedule");
      toast.success("Reschedule requested");
      setRescheduleOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request reschedule");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => setRescheduleOpen(true)}>
        Request Reschedule
      </Button>
      <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={cancel} disabled={submitting}>
        Cancel Appointment
      </Button>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Request a Reschedule</DialogTitle>
            <DialogDescription>The business will need to approve this new time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Date</Label>
              <Input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>New Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={requestReschedule} disabled={submitting || !date || !time}>
              {submitting ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
