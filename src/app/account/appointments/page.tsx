import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { getLinkedCustomerRecords } from "@/lib/customer-linked-data";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { formatDate } from "@/lib/utils";

export default async function CustomerAppointmentsPage() {
  await auth();
  const { profile } = await requireCustomerContext();
  const linked = await getLinkedCustomerRecords(profile.id);

  const emptyState = (
    <EmptyState icon={CalendarClock} title="No Appointments Yet" description="Consultations and fittings you book with a business will appear here." />
  );

  if (linked.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Appointments</h1>
        {emptyState}
      </div>
    );
  }

  const linkedByCustomerId = new Map(linked.map((l) => [l.customerId, l]));
  const appointments = await prisma.appointment.findMany({
    where: { customerId: { in: linked.map((l) => l.customerId) } },
    orderBy: { startTime: "desc" },
    include: { type: { select: { name: true, color: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Appointments</h1>
        <p className="text-sm text-muted-foreground">Consultations and fittings across every business you work with.</p>
      </div>

      {appointments.length === 0 ? (
        emptyState
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const business = linkedByCustomerId.get(appt.customerId);
            return (
              <Link key={appt.id} href={`/account/appointments/${appt.id}`}>
                <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{appt.title || appt.type.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {business?.businessName} · {formatDate(appt.startTime, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                      {appt.location && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" /> {appt.location}
                        </p>
                      )}
                    </div>
                    <AppointmentStatusBadge status={appt.status} />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
