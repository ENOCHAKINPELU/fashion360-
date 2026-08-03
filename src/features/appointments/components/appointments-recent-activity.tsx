import { Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Appointment created",
  REMINDER_SENT: "Reminder sent",
  CONFIRMED: "Customer confirmed",
  CHECKED_IN: "Checked in",
  STARTED: "Appointment started",
  COMPLETED: "Appointment completed",
  CANCELLED: "Appointment cancelled",
  RESCHEDULED: "Appointment rescheduled",
  NOTE_ADDED: "Note added",
  FOLLOW_UP_SCHEDULED: "Follow-up scheduled",
  STATUS_CHANGED: "Status updated",
};

export async function AppointmentsRecentActivity({ businessId }: { businessId: string }) {
  const history = await prisma.appointmentHistory.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      appointment: { select: { id: true, customer: { select: { firstName: true, lastName: true } } } },
      actor: { select: { name: true } },
    },
  });

  if (history.length === 0) {
    return <EmptyState icon={Activity} title="No activity yet" className="border-none py-8" />;
  }

  return (
    <ul className="space-y-3">
      {history.map((item) => (
        <li key={item.id} className="flex gap-3 text-sm">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0">
            <p className="text-foreground">
              {ACTION_LABELS[item.action] ?? item.action}
              {item.appointment && (
                <span className="text-muted-foreground">
                  {" "}
                  · {item.appointment.customer.firstName} {item.appointment.customer.lastName}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
