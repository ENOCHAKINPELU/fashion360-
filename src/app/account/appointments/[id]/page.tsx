import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, CalendarClock, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { CustomerAppointmentActions } from "@/features/appointments/components/customer-appointment-actions";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const HISTORY_LABELS: Record<string, string> = {
  CREATED: "Appointment Requested",
  CONFIRMED: "Business Confirmed",
  CHECKED_IN: "Checked In",
  STARTED: "Consultation Started",
  COMPLETED: "Appointment Completed",
  CANCELLED: "Appointment Cancelled",
  RESCHEDULED: "Appointment Rescheduled",
  RESCHEDULE_REQUESTED: "Reschedule Requested",
  RESCHEDULE_DECLINED: "Reschedule Request Declined",
  DECLINED: "Appointment Declined",
  NO_SHOW: "Marked as No Show",
  EXPIRED: "Appointment Expired",
  REMINDER_SENT: "Reminder Sent",
  NOTE_ADDED: "Note Added",
  FOLLOW_UP_SCHEDULED: "Follow-up Scheduled",
  STATUS_CHANGED: "Status Updated",
};

export default async function CustomerAppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireCustomerContext();

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      business: { select: { name: true } },
      type: true,
      serviceRequest: { select: { id: true, requestCode: true, service: { select: { name: true } } } },
      history: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!appointment || appointment.customerProfileId !== profile.id) notFound();

  return (
    <div className="space-y-6">
      <Link href="/account/appointments" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Back to Appointments
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{appointment.title || appointment.type.name}</h1>
          <p className="text-sm text-muted-foreground">{appointment.business.name}</p>
        </div>
        <AppointmentStatusBadge status={appointment.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardContent className="space-y-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Details</p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Date &amp; Time</dt>
                  <dd className="flex items-center gap-1 text-foreground">
                    <CalendarClock className="size-3.5" /> {formatDate(appointment.startTime, { dateStyle: "medium", timeStyle: "short" })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Type</dt>
                  <dd className="text-foreground">{appointment.type.name}</dd>
                </div>
                {appointment.location && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Location</dt>
                    <dd className="flex items-center gap-1 text-foreground">
                      <MapPin className="size-3.5" /> {appointment.location}
                    </dd>
                  </div>
                )}
                {appointment.serviceRequest && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Related Request</dt>
                    <dd>
                      <Link href={`/account/requests/${appointment.serviceRequest.id}`} className="text-primary hover:underline">
                        {appointment.serviceRequest.requestCode}
                        {appointment.serviceRequest.service ? ` · ${appointment.serviceRequest.service.name}` : ""}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
              {appointment.meetingLink && (
                <Button asChild size="sm" className="w-full gap-1.5 sm:w-auto">
                  <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                    <Video className="size-4" /> Join Call
                  </a>
                </Button>
              )}
              {appointment.notes && (
                <div>
                  <dt className="text-xs text-muted-foreground">Notes</dt>
                  <dd className="text-sm text-foreground">{appointment.notes}</dd>
                </div>
              )}
              {appointment.status === "RESCHEDULE_REQUESTED" && appointment.proposedStartTime && (
                <div className="rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm">
                  <p className="font-medium text-warning">
                    {appointment.proposedByRole === "CUSTOMER" ? "You proposed" : "The business proposed"} moving this to{" "}
                    {formatDate(appointment.proposedStartTime, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  {appointment.proposedReason && <p className="mt-1 text-muted-foreground">{appointment.proposedReason}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="space-y-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Actions</p>
              <CustomerAppointmentActions appointmentId={appointment.id} status={appointment.status} />
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Timeline</p>
            <ul className="space-y-3">
              {appointment.history.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm text-foreground">{HISTORY_LABELS[event.action] ?? event.action}</p>
                    {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(event.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
