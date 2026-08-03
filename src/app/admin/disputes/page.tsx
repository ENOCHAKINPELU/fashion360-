import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-danger-soft text-danger",
  UNDER_REVIEW: "bg-warning-soft text-warning",
  RESOLVED: "bg-success-soft text-success",
  CLOSED: "bg-muted text-muted-foreground",
};

export default async function AdminDisputesPage() {
  const disputes = await prisma.dispute.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      business: { select: { name: true } },
      order: { select: { orderCode: true } },
      customer: { select: { firstName: true, lastName: true } },
      resolution: { select: { resolutionType: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Disputes</h1>
        <p className="text-sm text-muted-foreground">Payout stays blocked for any order with an open or under-review dispute.</p>
      </div>

      {disputes.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No disputes" description="Customer-reported problems will appear here." />
      ) : (
        <div className="space-y-2">
          {disputes.map((d) => (
            <Link key={d.id} href={`/admin/disputes/${d.id}`}>
              <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{d.order.orderCode}</p>
                      <Badge className={STATUS_STYLES[d.status]}>{d.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.business.name} · {d.customer.firstName} {d.customer.lastName} · {d.issueType.replace(/_/g, " ")}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
