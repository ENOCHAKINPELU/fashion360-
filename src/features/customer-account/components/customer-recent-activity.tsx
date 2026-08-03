import { Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/shared/components/empty-state";
import { CUSTOMER_AUDIT_LABELS } from "@/lib/audit-log-labels";
import { formatRelativeTime } from "@/lib/utils";

export async function CustomerRecentActivity({ userId }: { userId: string }) {
  const events = await prisma.auditLog.findMany({
    where: { userId, action: { in: Object.keys(CUSTOMER_AUDIT_LABELS) as (keyof typeof CUSTOMER_AUDIT_LABELS)[] } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  if (events.length === 0) {
    return <EmptyState icon={Activity} title="No Activity Yet" className="border-none py-10" />;
  }

  return (
    <ul className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0">
            <p className="text-sm text-foreground">{CUSTOMER_AUDIT_LABELS[event.action] ?? event.action}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(event.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
