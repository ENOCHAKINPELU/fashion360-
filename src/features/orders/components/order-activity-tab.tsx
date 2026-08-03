import type { LucideIcon } from "lucide-react";
import {
  Activity,
  PackagePlus,
  Pencil,
  Ruler,
  CheckCircle2,
  Workflow,
  Hammer,
  Shirt,
  Scissors,
  Wallet,
  Banknote,
  NotebookText,
  Paperclip,
  PackageCheck,
  Truck,
  Ban,
  Archive,
  ArchiveRestore,
  Copy,
  RotateCcw,
} from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import type { OrderActivityData } from "@/features/orders/types";

const TYPE_ICONS: Record<string, LucideIcon> = {
  ORDER_CREATED: PackagePlus,
  ORDER_UPDATED: Pencil,
  DESIGN_UPDATED: Shirt,
  MEASUREMENT_CHANGED: Ruler,
  DESIGN_APPROVED: CheckCircle2,
  STATUS_CHANGED: Workflow,
  PRODUCTION_STAGE_UPDATED: Hammer,
  FITTING_SCHEDULED: Shirt,
  FITTING_COMPLETED: CheckCircle2,
  ALTERATION_ADDED: Scissors,
  ALTERATION_UPDATED: Scissors,
  PAYMENT_REQUESTED: Wallet,
  PAYMENT_RECEIVED: Banknote,
  NOTE_ADDED: NotebookText,
  FILE_UPLOADED: Paperclip,
  ORDER_COMPLETED: PackageCheck,
  PICKUP_SCHEDULED: Truck,
  DELIVERY_COMPLETED: Truck,
  ORDER_CANCELLED: Ban,
  ORDER_ARCHIVED: Archive,
  ORDER_RESTORED: ArchiveRestore,
  ORDER_DUPLICATED: Copy,
  ORDER_REORDERED: RotateCcw,
};

export function OrderActivityTab({ activities }: { activities: OrderActivityData[] }) {
  if (activities.length === 0) {
    return <EmptyState icon={Activity} title="No activity yet" description="Actions taken on this order will show up here." className="border-none py-12" />;
  }

  return (
    <ol className="space-y-0">
      {activities.map((item) => {
        const Icon = TYPE_ICONS[item.type] ?? Activity;
        return (
          <li
            key={item.id}
            className="relative flex gap-3 border-l border-border pb-6 pl-4 last:border-l-transparent last:pb-0"
          >
            <span className="absolute top-0.5 -left-[13px] flex size-6 items-center justify-center rounded-full bg-accent-soft text-primary">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
              {(item.previousValue || item.newValue) && (
                <p className="text-xs text-muted-foreground">
                  {item.previousValue ?? "N/A"} → {item.newValue ?? "N/A"}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                {formatRelativeTime(item.createdAt)} · {formatDate(item.createdAt)}
                {item.actor?.name ? ` · ${item.actor.name}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
