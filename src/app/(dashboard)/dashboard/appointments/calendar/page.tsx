import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppointmentsCalendar } from "@/features/appointments/components/calendar/appointments-calendar";

export default async function AppointmentsCalendarPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const [business, blockedDates] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { workingHours: true } }),
    prisma.blockedDate.findMany({ where: { businessId } }),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/appointments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to Appointments
      </Link>

      <AppointmentsCalendar
        workingHours={business?.workingHours as never}
        blockedDates={JSON.parse(JSON.stringify(blockedDates))}
      />
    </div>
  );
}
