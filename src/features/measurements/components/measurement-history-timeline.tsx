import { History } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Measurement created",
  UPDATED: "Measurement updated",
  APPROVED: "Approved",
  ARCHIVED: "Archived",
  RESTORED: "Restored",
  NOTE_ADDED: "Note added",
  PROFILE_CREATED: "Profile created",
  PROFILE_RENAMED: "Profile renamed",
  PROFILE_ARCHIVED: "Profile archived",
  PROFILE_DELETED: "Profile deleted",
  PROFILE_DUPLICATED: "Profile duplicated",
  SET_DEFAULT: "Set as default profile",
};

export interface MeasurementHistoryItem {
  id: string;
  action: string;
  reason: string | null;
  notes: string | null;
  changes: { field: string; from: number | null; to: number | null }[] | null;
  createdAt: string;
  actor?: { name: string | null } | null;
}

export function MeasurementHistoryTimeline({ history, fieldLabels }: { history: MeasurementHistoryItem[]; fieldLabels?: Record<string, string> }) {
  if (history.length === 0) {
    return <EmptyState icon={History} title="No history yet" className="border-none py-8" />;
  }

  return (
    <ol className="space-y-5">
      {history.map((item, i) => (
        <li key={item.id} className="relative flex gap-3 pl-1">
          {i !== history.length - 1 && (
            <span className="absolute top-4 left-[7px] h-full w-px bg-border" aria-hidden="true" />
          )}
          <span className="relative z-10 mt-1.5 size-[7px] shrink-0 rounded-full bg-primary" />
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{ACTION_LABELS[item.action] ?? item.action}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(item.createdAt, { dateStyle: "medium", timeStyle: "short" })} ({formatRelativeTime(item.createdAt)})
              </p>
            </div>
            {item.actor?.name && <p className="text-xs text-muted-foreground">by {item.actor.name}</p>}
            {item.reason && <p className="mt-1 text-sm text-foreground">Reason: {item.reason}</p>}
            {item.notes && <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>}
            {item.changes && item.changes.length > 0 && (
              <ul className="mt-2 space-y-1 rounded-lg border border-border bg-muted/30 p-2.5">
                {item.changes.map((change) => (
                  <li key={change.field} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{fieldLabels?.[change.field] ?? change.field}</span>
                    <span className="font-medium text-foreground">
                      {change.from ?? "N/A"} → {change.to ?? "N/A"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
