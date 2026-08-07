"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  XCircle,
  CalendarClock,
  CheckCircle2,
  Ruler,
  ShoppingBag,
  FileText,
  LogIn,
  Play,
  Phone,
  Mail,
  MessageCircle,
  Ban,
  UserX,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditAppointmentDialog } from "@/features/appointments/components/edit-appointment-dialog";
import { RescheduleDialog } from "@/features/appointments/components/reschedule-dialog";
import { CancelAppointmentDialog } from "@/features/appointments/components/cancel-appointment-dialog";
import { CaptureMeasurementsDialog } from "@/features/appointments/components/capture-measurements-dialog";

interface DetailActionsProps {
  appointment: {
    id: string;
    status: string;
    startTime: string;
    endTime: string;
    typeId: string;
    assignedStaffId: string | null;
    location: string | null;
    meetingLink: string | null;
    notes: string | null;
    customerProfileId?: string | null;
    typeCategory?: string;
    customer: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null };
  };
}

export function AppointmentDetailActions({ appointment }: DetailActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function runAction(action: "confirm" | "check-in" | "start" | "complete" | "decline" | "no-show" | "approve-reschedule" | "decline-reschedule") {
    setPending(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Could not update appointment");
      toast.success("Appointment updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  const phoneDigits = appointment.customer.phone?.replace(/[^\d]/g, "");
  const durationMinutes = Math.round(
    (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) / 60_000
  );
  const isFinal = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(appointment.status);

  return (
    <div className="space-y-4">
      {appointment.status === "RESCHEDULE_REQUESTED" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3">
          <span className="text-sm text-warning">A reschedule was requested for this appointment.</span>
          <Button size="sm" disabled={pending} onClick={() => runAction("approve-reschedule")}>
            Approve
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => runAction("decline-reschedule")}>
            Decline
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {appointment.status === "PENDING_CONFIRMATION" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => runAction("confirm")}>
            <CheckCircle2 className="size-3.5" /> Confirm
          </Button>
        )}
        {appointment.status === "PENDING_CONFIRMATION" && (
          <Button size="sm" variant="outline" className="text-danger hover:text-danger" disabled={pending} onClick={() => runAction("decline")}>
            <Ban className="size-3.5" /> Decline
          </Button>
        )}
        {["SCHEDULED", "CONFIRMED"].includes(appointment.status) && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => runAction("check-in")}>
            <LogIn className="size-3.5" /> Check In
          </Button>
        )}
        {appointment.status === "CHECKED_IN" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => runAction("start")}>
            <Play className="size-3.5" /> Start
          </Button>
        )}
        {!isFinal && (
          <Button size="sm" disabled={pending} onClick={() => runAction("complete")}>
            <CheckCircle2 className="size-3.5" /> Mark Completed
          </Button>
        )}
        {["SCHEDULED", "CONFIRMED", "PENDING_CONFIRMATION"].includes(appointment.status) && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => runAction("no-show")}>
            <UserX className="size-3.5" /> No Show
          </Button>
        )}
        {!isFinal && (
          <Button size="sm" variant="outline" onClick={() => setRescheduleOpen(true)}>
            <CalendarClock className="size-3.5" /> Reschedule
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="size-3.5" /> Edit
        </Button>
        {!isFinal && (
          <Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)}>
            <XCircle className="size-3.5" /> Cancel
          </Button>
        )}
        {appointment.typeCategory === "MEASUREMENT" && appointment.customerProfileId && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCaptureOpen(true)}>
            <Ruler className="size-3.5" /> Capture Measurements
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {appointment.meetingLink && (
          <a
            href={appointment.meetingLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-accent-soft px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent-soft/80"
          >
            <Video className="size-3.5" /> Join Call
          </a>
        )}
        <Link
          href={`/dashboard/measurements?customerId=${appointment.customer.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent-soft"
        >
          <Ruler className="size-3.5" /> Start Measurement
        </Link>
        <Link
          href={`/dashboard/orders/new?customerId=${appointment.customer.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent-soft"
        >
          <ShoppingBag className="size-3.5" /> Create Order
        </Link>
        <Link
          href={`/dashboard/quotations?customerId=${appointment.customer.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent-soft"
        >
          <FileText className="size-3.5" /> Generate Quote
        </Link>
        <a
          href={appointment.customer.phone ? `tel:${appointment.customer.phone}` : undefined}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent-soft"
        >
          <Phone className="size-3.5" /> Call
        </a>
        <a
          href={appointment.customer.email ? `mailto:${appointment.customer.email}` : undefined}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent-soft"
        >
          <Mail className="size-3.5" /> Email
        </a>
        <a
          href={phoneDigits ? `https://wa.me/${phoneDigits}` : undefined}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent-soft"
        >
          <MessageCircle className="size-3.5" /> WhatsApp
        </a>
      </div>

      <EditAppointmentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        appointmentId={appointment.id}
        defaultValues={{
          typeId: appointment.typeId,
          assignedStaffId: appointment.assignedStaffId,
          location: appointment.location,
          meetingLink: appointment.meetingLink,
          notes: appointment.notes,
        }}
      />
      <RescheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        appointmentId={appointment.id}
        currentStart={appointment.startTime}
        currentDurationMinutes={durationMinutes}
      />
      <CancelAppointmentDialog open={cancelOpen} onOpenChange={setCancelOpen} appointmentId={appointment.id} />
      {appointment.customerProfileId && (
        <CaptureMeasurementsDialog open={captureOpen} onOpenChange={setCaptureOpen} appointmentId={appointment.id} />
      )}
    </div>
  );
}
