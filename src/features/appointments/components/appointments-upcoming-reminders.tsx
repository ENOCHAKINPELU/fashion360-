import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime } from "@/lib/utils";

export async function AppointmentsUpcomingReminders({ businessId }: { businessId: string }) {
  const reminders = await prisma.appointmentReminder.findMany({
    where: { status: "PENDING", appointment: { businessId } },
    orderBy: { scheduledFor: "asc" },
    take: 8,
    include: { appointment: { include: { customer: true, type: true } } },
  });

  if (reminders.length === 0) {
    return <EmptyState icon={Bell} title="No reminders scheduled" className="border-none py-8" />;
  }

  return (
    <ul className="space-y-3">
      {reminders.map((reminder) => (
        <li key={reminder.id} className="flex items-start gap-3 text-sm">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary">
            <Bell className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-foreground">
              {reminder.appointment.customer.firstName} {reminder.appointment.customer.lastName}{" "}
              ({reminder.appointment.type.name})
            </p>
            <p className="text-xs text-muted-foreground">
              {reminder.channel} · {formatRelativeTime(reminder.scheduledFor)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
