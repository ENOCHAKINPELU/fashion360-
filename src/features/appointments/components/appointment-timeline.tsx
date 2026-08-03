import { History } from "lucide-react";
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
  DECLINED: "Appointment declined",
  RESCHEDULE_REQUESTED: "Reschedule requested",
  RESCHEDULE_DECLINED: "Reschedule request declined",
  EXPIRED: "Appointment expired",
  NO_SHOW: "Marked as no-show",
};

export interface AppointmentHistoryItem {
  id: string;
  action: string;
  description: string | null;
  createdAt: string;
  actor?: { name: string | null } | null;
}

export function AppointmentTimeline({ history }: { history: AppointmentHistoryItem[] }) {
  if (history.length === 0) {
    return <EmptyState icon={History} title="No activity yet" className="border-none py-8" />;
  }

  return (
    <ol className="space-y-5">
      {history.map((item, i) => (
        <li key={item.id} className="relative flex gap-3 pl-1">
          {i !== history.length - 1 && (
            <span className="absolute top-4 left-[7px] h-full w-px bg-border" aria-hidden="true" />
          )}
          <span className="relative z-10 mt-1.5 size-[7px] shrink-0 rounded-full bg-primary" />
          <div>
            <p className="text-sm text-foreground">{ACTION_LABELS[item.action] ?? item.action}</p>
            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              {formatRelativeTime(item.createdAt)}
              {item.actor?.name ? ` · ${item.actor.name}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
