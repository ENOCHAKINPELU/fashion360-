import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, MapPin, User as UserIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/shared/components/user-avatar";
import { EmptyState } from "@/shared/components/empty-state";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { AppointmentTimeline } from "@/features/appointments/components/appointment-timeline";
import { AppointmentNotesPanel } from "@/features/appointments/components/appointment-notes-panel";
import { AppointmentDetailActions } from "@/features/appointments/components/appointment-detail-actions";
import { formatDate } from "@/lib/utils";
import { CalendarClock } from "lucide-react";

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const businessId = session!.user.businessId!;

  const appointment = await prisma.appointment.findFirst({
    where: { id, businessId },
    include: {
      customer: true,
      type: true,
      assignedStaff: { select: { id: true, name: true, image: true } },
      appointmentNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      history: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  });
  if (!appointment) notFound();

  const [previous, upcoming] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId, customerId: appointment.customerId, startTime: { lt: appointment.startTime } },
      orderBy: { startTime: "desc" },
      take: 5,
      include: { type: true },
    }),
    prisma.appointment.findMany({
      where: {
        businessId,
        customerId: appointment.customerId,
        startTime: { gt: appointment.startTime },
        id: { not: appointment.id },
      },
      orderBy: { startTime: "asc" },
      take: 5,
      include: { type: true },
    }),
  ]);

  const serialized = JSON.parse(JSON.stringify(appointment));
  const durationMinutes = Math.round((appointment.endTime.getTime() - appointment.startTime.getTime()) / 60_000);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/appointments/calendar"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to calendar
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: appointment.type.color }} />
                <CardTitle>{appointment.type.name}</CardTitle>
              </div>
              <AppointmentStatusBadge status={appointment.status} />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Detail icon={Clock} label="Date & Time" value={formatDate(appointment.startTime, { dateStyle: "medium", timeStyle: "short" })} />
              <Detail icon={Clock} label="Duration" value={`${durationMinutes} minutes`} />
              <Detail icon={MapPin} label="Location" value={appointment.location ?? "N/A"} />
              <Detail icon={UserIcon} label="Designer" value={appointment.assignedStaff?.name ?? "Unassigned"} />
            </CardContent>
            {appointment.notes && (
              <CardContent className="border-t border-border pt-4 text-sm text-foreground">{appointment.notes}</CardContent>
            )}
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentDetailActions
                appointment={{
                  id: appointment.id,
                  status: appointment.status,
                  startTime: serialized.startTime,
                  endTime: serialized.endTime,
                  typeId: appointment.typeId,
                  typeCategory: appointment.type.category,
                  customerProfileId: appointment.customerProfileId,
                  assignedStaffId: appointment.assignedStaffId,
                  location: appointment.location,
                  meetingLink: appointment.meetingLink,
                  notes: appointment.notes,
                  customer: {
                    id: appointment.customer.id,
                    firstName: appointment.customer.firstName,
                    lastName: appointment.customer.lastName,
                    email: appointment.customer.email,
                    phone: appointment.customer.phone,
                  },
                }}
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Appointment Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentNotesPanel appointmentId={appointment.id} notes={serialized.appointmentNotes} />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Appointment Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentTimeline history={serialized.history} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/dashboard/customers/${appointment.customer.id}`}
                className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-accent-soft/40"
              >
                <UserAvatar
                  name={`${appointment.customer.firstName} ${appointment.customer.lastName}`}
                  image={appointment.customer.profilePhotoUrl}
                  className="size-10"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {appointment.customer.firstName} {appointment.customer.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{appointment.customer.customerCode}</p>
                </div>
              </Link>
              <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <p>{appointment.customer.phone ?? "N/A"}</p>
                <p>{appointment.customer.email ?? "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Previous Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {previous.length === 0 ? (
                <EmptyState icon={CalendarClock} title="None yet" className="border-none py-6" />
              ) : (
                <ul className="space-y-2">
                  {previous.map((a) => (
                    <MiniAppointmentRow key={a.id} appointment={a} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <EmptyState icon={CalendarClock} title="None scheduled" className="border-none py-6" />
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((a) => (
                    <MiniAppointmentRow key={a.id} appointment={a} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-0.5 font-medium text-foreground">{value}</p>
    </div>
  );
}

function MiniAppointmentRow({
  appointment,
}: {
  appointment: { id: string; startTime: Date; status: string; type: { name: string; color: string } };
}) {
  return (
    <li>
      <Link
        href={`/dashboard/appointments/${appointment.id}`}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60"
      >
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: appointment.type.color }} />
        <span className="min-w-0 flex-1 truncate text-foreground">{appointment.type.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(appointment.startTime, { dateStyle: "short" })}</span>
      </Link>
    </li>
  );
}
