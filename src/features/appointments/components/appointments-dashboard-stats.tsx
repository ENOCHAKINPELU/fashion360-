import { CalendarClock, CalendarCheck2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { prisma } from "@/lib/prisma";

export async function AppointmentsDashboardStats({ businessId }: { businessId: string }) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [today, upcoming, completed, cancelled, rescheduled] = await Promise.all([
    prisma.appointment.count({ where: { businessId, startTime: { gte: todayStart, lt: todayEnd } } }),
    prisma.appointment.count({
      where: { businessId, startTime: { gte: todayEnd }, status: { in: ["SCHEDULED", "CONFIRMED", "PENDING_CONFIRMATION"] } },
    }),
    prisma.appointment.count({ where: { businessId, status: "COMPLETED" } }),
    prisma.appointment.count({ where: { businessId, status: "CANCELLED" } }),
    prisma.appointment.count({ where: { businessId, rescheduleCount: { gt: 0 }, startTime: { gte: now } } }),
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Today's Appointments" value={String(today)} icon={CalendarClock} />
      <StatCard label="Upcoming Appointments" value={String(upcoming)} icon={CalendarCheck2} />
      <StatCard label="Completed" value={String(completed)} icon={CheckCircle2} />
      <StatCard label="Cancelled" value={String(cancelled)} icon={XCircle} />
      <StatCard label="Rescheduled" value={String(rescheduled)} icon={RotateCcw} />
    </div>
  );
}
