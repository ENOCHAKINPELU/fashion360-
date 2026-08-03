import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/shared/components/empty-state";
import { UserAvatar } from "@/shared/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: "bg-info/10 text-info",
  PAUSED: "bg-warning/10 text-warning",
  COMPLETED: "bg-success/10 text-success",
  CANCELLED: "bg-danger/10 text-danger",
};

export async function RecentSessionsWidget({ businessId }: { businessId: string }) {
  const sessions = await prisma.measurementSession.findMany({
    where: { businessId },
    orderBy: { startedAt: "desc" },
    take: 6,
    include: { customer: { select: { firstName: true, lastName: true, profilePhotoUrl: true } } },
  });

  if (sessions.length === 0) {
    return <EmptyState icon={CalendarClock} title="No sessions yet" className="border-none py-8" />;
  }

  return (
    <ul className="space-y-3">
      {sessions.map((s) => {
        const href =
          s.status === "COMPLETED" && s.resultMeasurementId
            ? `/dashboard/measurements/${s.resultMeasurementId}`
            : `/dashboard/measurements/sessions/${s.id}`;
        return (
          <li key={s.id}>
            <Link href={href} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-muted/60">
              <UserAvatar name={`${s.customer.firstName} ${s.customer.lastName}`} image={s.customer.profilePhotoUrl} className="size-8" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {s.customer.firstName} {s.customer.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.method === "PHOTO_ESTIMATION" ? "Photo estimation" : "Manual"} · {formatRelativeTime(s.startedAt)}
                </p>
              </div>
              <Badge className={`border-transparent font-medium ${STATUS_STYLES[s.status]}`}>{s.status.replace("_", " ")}</Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
