import { CheckCircle2, Circle, CircleDot, MinusCircle } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { ORDER_TIMELINE_STAGES } from "@/lib/order-timeline";
import type { OrderTimelineEntryData } from "@/features/orders/types";

const STAGE_LABELS = Object.fromEntries(ORDER_TIMELINE_STAGES.map((s) => [s.stage, s.label]));

function StageIcon({ status }: { status: string }) {
  if (status === "COMPLETED") return <CheckCircle2 className="size-4 text-success" />;
  if (status === "IN_PROGRESS") return <CircleDot className="size-4 text-primary" />;
  if (status === "SKIPPED") return <MinusCircle className="size-4 text-muted-foreground" />;
  return <Circle className="size-4 text-muted-foreground" />;
}

export function OrderTimelineView({ timeline }: { timeline: OrderTimelineEntryData[] }) {
  const sorted = [...timeline].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <ol className="space-y-0">
      {sorted.map((entry, i) => {
        const isLast = i === sorted.length - 1;
        return (
          <li
            key={entry.id}
            className={cn(
              "relative flex gap-3 border-l pb-6 pl-4 last:pb-0",
              entry.isApplicable ? "border-border" : "border-border/50",
              isLast && "border-l-transparent"
            )}
          >
            <span className="absolute top-0.5 -left-[9px] flex size-4 items-center justify-center rounded-full bg-background">
              <StageIcon status={entry.status} />
            </span>
            <div className={cn("min-w-0", !entry.isApplicable && "opacity-40")}>
              <p className="text-sm font-medium text-foreground">
                {STAGE_LABELS[entry.stage] ?? entry.stage}
              </p>
              <p className="text-xs text-muted-foreground">
                {entry.occurredAt ? formatDate(entry.occurredAt) : entry.isApplicable ? "Not yet reached" : "Not applicable"}
                {entry.actor?.name ? ` · ${entry.actor.name}` : ""}
              </p>
              {entry.note && <p className="mt-1 text-xs text-foreground/80">{entry.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
