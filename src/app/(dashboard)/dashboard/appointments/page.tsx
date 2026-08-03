import Link from "next/link";
import { CalendarDays, CalendarClock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { AppointmentsDashboardStats } from "@/features/appointments/components/appointments-dashboard-stats";
import { AppointmentsWeekPreview } from "@/features/appointments/components/appointments-week-preview";
import { AppointmentsRecentActivity } from "@/features/appointments/components/appointments-recent-activity";
import { AppointmentsUpcomingReminders } from "@/features/appointments/components/appointments-upcoming-reminders";
import { AppointmentsDashboardClient } from "@/features/appointments/components/appointments-dashboard-client";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { processDueReminders } from "@/lib/appointment-reminders";

export default async function AppointmentsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const params = await searchParams;

  await processDueReminders().catch(() => {});

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [todayAppointments, prefilledCustomer] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId, startTime: { gte: todayStart, lt: todayEnd } },
      orderBy: { startTime: "asc" },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, profilePhotoUrl: true } },
        type: true,
        assignedStaff: { select: { id: true, name: true, image: true } },
      },
    }),
    params.customerId
      ? prisma.customer.findFirst({
          where: { id: params.customerId, businessId },
          select: { id: true, firstName: true, lastName: true, phone: true, profilePhotoUrl: true },
        })
      : null,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Appointments</h1>
          <p className="text-sm text-muted-foreground">Every consultation, fitting, and pickup in one place.</p>
        </div>
        <Link href="/dashboard/appointments/calendar">
          <Button variant="outline" className="gap-1.5">
            <CalendarDays className="size-4" /> Open Calendar
          </Button>
        </Link>
      </div>

      <AppointmentsDashboardStats businessId={businessId} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-none shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayAppointments.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No appointments today" className="border-none py-10" />
            ) : (
              todayAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={JSON.parse(JSON.stringify(appointment))} />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentsDashboardClient prefilledCustomer={prefilledCustomer ?? undefined} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentsWeekPreview businessId={businessId} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentsRecentActivity businessId={businessId} />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Upcoming Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentsUpcomingReminders businessId={businessId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
