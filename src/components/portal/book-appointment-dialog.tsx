"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { APPOINTMENT_TYPES, APPOINTMENT_TYPE_LABELS } from "@/lib/validations/appointment";

export function BookAppointmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const date = String(form.get("date"));
    const startTime = String(form.get("startTime"));
    const endTime = String(form.get("endTime"));

    const res = await fetch("/api/portal/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.get("type"),
        startTime: new Date(`${date}T${startTime}`).toISOString(),
        endTime: new Date(`${date}T${endTime}`).toISOString(),
        notes: form.get("notes"),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not book appointment");
      return;
    }

    toast.success("Appointment requested");
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Book an appointment">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select id="type" name="type" required defaultValue="">
            <option value="" disabled>
              Select type...
            </option>
            {APPOINTMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {APPOINTMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div>
            <Label htmlFor="startTime">Start</Label>
            <Input id="startTime" name="startTime" type="time" required defaultValue="10:00" />
          </div>
          <div>
            <Label htmlFor="endTime">End</Label>
            <Input id="endTime" name="endTime" type="time" required defaultValue="11:00" />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={2} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Requesting..." : "Request appointment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
