import { Activity } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  createdAt: string;
  actor?: { name: string | null } | null;
}

export function CustomerActivityTimeline({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return <EmptyState icon={Activity} title="No activity yet" className="border-none py-10" />;
  }

  return (
    <ol className="space-y-5">
      {activities.map((item, i) => (
        <li key={item.id} className="relative flex gap-3 pl-1">
          {i !== activities.length - 1 && (
            <span className="absolute top-4 left-[7px] h-full w-px bg-border" aria-hidden="true" />
          )}
          <span className="relative z-10 mt-1.5 size-[7px] shrink-0 rounded-full bg-primary" />
          <div>
            <p className="text-sm text-foreground">{item.title}</p>
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
