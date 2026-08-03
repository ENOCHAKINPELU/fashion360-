import { Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Measurement created",
  UPDATED: "Measurement updated",
  APPROVED: "Measurement approved",
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

export async function MeasurementActivityWidget({ businessId }: { businessId: string }) {
  const history = await prisma.measurementHistory.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      actor: { select: { name: true } },
      measurement: { select: { customer: { select: { firstName: true, lastName: true } } } },
      profile: { select: { customer: { select: { firstName: true, lastName: true } }, name: true } },
    },
  });

  if (history.length === 0) {
    return <EmptyState icon={Activity} title="No activity yet" className="border-none py-8" />;
  }

  return (
    <ul className="space-y-3">
      {history.map((item) => {
        const customerName = item.measurement?.customer
          ? `${item.measurement.customer.firstName} ${item.measurement.customer.lastName}`
          : item.profile?.customer
            ? `${item.profile.customer.firstName} ${item.profile.customer.lastName}`
            : null;
        return (
          <li key={item.id} className="flex gap-3 text-sm">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0">
              <p className="text-foreground">
                {ACTION_LABELS[item.action] ?? item.action}
                {customerName && <span className="text-muted-foreground"> · {customerName}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(item.createdAt)}
                {item.actor?.name ? ` · ${item.actor.name}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
