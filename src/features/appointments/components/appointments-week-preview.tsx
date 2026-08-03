import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export async function AppointmentsWeekPreview({ businessId }: { businessId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const appointments = await prisma.appointment.findMany({
    where: { businessId, startTime: { gte: weekStart, lt: weekEnd }, status: { notIn: ["CANCELLED"] } },
    select: { id: true, startTime: true, type: { select: { color: true } } },
  });

  const days = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayAppointments = appointments.filter((a) => a.startTime >= day && a.startTime < dayEnd);
    return { day, count: dayAppointments.length, colors: dayAppointments.slice(0, 4).map((a) => a.type.color) };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(({ day, count, colors }) => (
        <Link
          key={day.toISOString()}
          href={`/dashboard/appointments/calendar?date=${day.toISOString().slice(0, 10)}`}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors hover:border-primary/40",
            day.getTime() === today.getTime() ? "border-primary bg-accent-soft" : "border-border bg-surface"
          )}
        >
          <span className="text-xs text-muted-foreground">{day.toLocaleDateString(undefined, { weekday: "short" })}</span>
          <span className="text-sm font-semibold text-foreground">{day.getDate()}</span>
          <div className="flex h-2 items-center gap-0.5">
            {colors.map((color, i) => (
              <span key={i} className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">{count || "N/A"}</span>
        </Link>
      ))}
    </div>
  );
}
