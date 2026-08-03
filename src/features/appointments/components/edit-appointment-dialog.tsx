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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AppointmentTypeOption {
  id: string;
  name: string;
  color: string;
}
interface StaffOption {
  id: string;
  name: string | null;
}

export function EditAppointmentDialog({
  open,
  onOpenChange,
  appointmentId,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  defaultValues: { typeId: string; assignedStaffId: string | null; location: string | null; notes: string | null };
}) {
  const router = useRouter();
  const [types, setTypes] = useState<AppointmentTypeOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [typeId, setTypeId] = useState(defaultValues.typeId);
  const [assignedStaffId, setAssignedStaffId] = useState(defaultValues.assignedStaffId ?? "");
  const [location, setLocation] = useState(defaultValues.location ?? "");
  const [notes, setNotes] = useState(defaultValues.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setTypeId(defaultValues.typeId);
    setAssignedStaffId(defaultValues.assignedStaffId ?? "");
    setLocation(defaultValues.location ?? "");
    setNotes(defaultValues.notes ?? "");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    fetch("/api/appointments/types")
      .then((res) => res.json())
      .then((data) => setTypes(data.types ?? []));
    fetch("/api/staff")
      .then((res) => res.json())
      .then((data) => setStaff(data.staff ?? []));
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeId, assignedStaffId: assignedStaffId || null, location: location || null, notes: notes || null }),
      });
      if (!res.ok) throw new Error("Could not update appointment");
      toast.success("Appointment updated");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
          <DialogDescription>Update the type, designer, location, or notes. To change the date or time, use Reschedule instead.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Appointment Type</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assigned Designer</Label>
            <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Meeting Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
