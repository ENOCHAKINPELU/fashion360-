import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { Activity } from "lucide-react";

export async function RecentActivity({ businessId, userId }: { businessId: string; userId: string }) {
  const activity = await prisma.notification.findMany({
    where: { businessId, OR: [{ userId }, { userId: null }] },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  if (activity.length === 0) {
    return <EmptyState icon={Activity} title="No activity yet" className="border-none py-10" />;
  }

  return (
    <ul className="space-y-4">
      {activity.map((item) => (
        <li key={item.id} className="flex gap-3">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0">
            <p className="text-sm text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
