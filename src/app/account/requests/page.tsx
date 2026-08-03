import Link from "next/link";
import { ClipboardList, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { ServiceRequestStatusBadge } from "@/features/discover/components/service-request-status-badge";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const BUCKETS = [
  { key: "pending", label: "Pending", statuses: ["SUBMITTED"] },
  { key: "active", label: "Active", statuses: ["RECEIVED", "UNDER_REVIEW"] },
  { key: "completed", label: "Completed", statuses: ["ACCEPTED", "CONVERTED_TO_APPOINTMENT", "CONVERTED_TO_ORDER"] },
  { key: "declined", label: "Declined", statuses: ["DECLINED"] },
  { key: "cancelled", label: "Cancelled", statuses: ["CANCELLED", "EXPIRED"] },
] as const;

export default async function CustomerServiceRequestsPage() {
  const { profile } = await requireCustomerContext();

  const requests = await prisma.serviceRequest.findMany({
    where: { customerProfileId: profile.id },
    orderBy: { updatedAt: "desc" },
    include: { business: { select: { name: true } }, service: { select: { name: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Requests</h1>
        <p className="text-sm text-muted-foreground">Service requests you&apos;ve sent to fashion businesses.</p>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No Service Requests Yet"
          description="Find a fashion business and request a service."
        />
      ) : (
        BUCKETS.map((bucket) => {
          const items = requests.filter((r) => (bucket.statuses as readonly string[]).includes(r.status));
          if (items.length === 0) return null;
          return (
            <div key={bucket.key} className="space-y-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {bucket.label} ({items.length})
              </p>
              <div className="space-y-2">
                {items.map((request) => (
                  <Link key={request.id} href={`/account/requests/${request.id}`}>
                    <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                      <CardContent className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{request.business.name}</p>
                            <ServiceRequestStatusBadge status={request.status} />
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {request.service?.name ?? "General inquiry"} · {request.requestCode} · Updated {formatRelativeTime(request.updatedAt)}
                          </p>
                          {request.preferredDate && (
                            <p className="text-xs text-muted-foreground">Preferred: {formatDate(request.preferredDate)}</p>
                          )}
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
