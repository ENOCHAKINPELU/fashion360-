import Link from "next/link";
import { Inbox, ChevronRight } from "lucide-react";
import type { ServiceRequestStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { ServiceRequestStatusBadge } from "@/features/discover/components/service-request-status-badge";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: undefined, label: "All" },
  { value: "SUBMITTED", label: "New" },
  { value: "RECEIVED,UNDER_REVIEW", label: "In Progress" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "DECLINED", label: "Declined" },
] as const;

export default async function BusinessServiceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const params = await searchParams;
  const statusFilter = params.status;

  const requests = await prisma.serviceRequest.findMany({
    where: {
      businessId,
      ...(statusFilter ? { status: { in: statusFilter.split(",") as ServiceRequestStatus[] } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      customerProfile: { include: { user: { select: { name: true, email: true, image: true } } } },
      service: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Service Requests</h1>
        <p className="text-sm text-muted-foreground">Requests from customers on Fashion360.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/dashboard/service-requests?status=${f.value}` : "/dashboard/service-requests"}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.value || (!statusFilter && !f.value)
                ? "border-primary bg-accent-soft text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={Inbox} title="No Service Requests Yet" description="Your customer requests will appear here." />
      ) : (
        <div className="space-y-2">
          {requests.map((request) => (
            <Link key={request.id} href={`/dashboard/service-requests/${request.id}`}>
              <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3">
                  {request.customerProfile.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={request.customerProfile.user.image} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-primary">
                      {(request.customerProfile.user.name ?? request.customerProfile.user.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {request.customerProfile.user.name ?? request.customerProfile.user.email}
                      </p>
                      <ServiceRequestStatusBadge status={request.status} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {request.service?.name ?? "General inquiry"} · {request.requestCode} · Requested {formatRelativeTime(request.createdAt)}
                    </p>
                    {request.preferredDate && <p className="text-xs text-muted-foreground">Preferred: {formatDate(request.preferredDate)}</p>}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
