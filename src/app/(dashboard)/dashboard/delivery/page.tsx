import Link from "next/link";
import { Truck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  CREATED: "bg-muted text-muted-foreground",
  COURIER_ASSIGNED: "bg-info-soft text-info",
  PICKUP_SCHEDULED: "bg-info-soft text-info",
  PICKED_UP: "bg-info-soft text-info",
  IN_TRANSIT: "bg-warning-soft text-warning",
  OUT_FOR_DELIVERY: "bg-warning-soft text-warning",
  DELIVERED: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
  CANCELLED: "bg-danger-soft text-danger",
  RETURNED: "bg-danger-soft text-danger",
};

export default async function DeliveryPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const deliveries = await prisma.delivery.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { id: true, orderCode: true, customer: { select: { firstName: true, lastName: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Delivery</h1>
        <p className="text-sm text-muted-foreground">Track pickup and home delivery logistics with confirmation and status updates.</p>
      </div>

      {deliveries.length === 0 ? (
        <EmptyState icon={Truck} title="No deliveries yet" description="Deliveries appear here once an order passes quality control and is dispatched." />
      ) : (
        <div className="space-y-2">
          {deliveries.map((d) => (
            <Link key={d.id} href={`/dashboard/orders/${d.order.id}?tab=quality-delivery`}>
              <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {d.order.orderCode} · {d.order.customer.firstName} {d.order.customer.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.provider}
                      {d.trackingNumber ? ` · ${d.trackingNumber}` : ""} · Created {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <Badge className={STATUS_STYLES[d.status] ?? STATUS_STYLES.CREATED}>{d.status.replace(/_/g, " ")}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
