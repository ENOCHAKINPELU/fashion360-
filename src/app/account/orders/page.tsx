import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { getLinkedCustomerRecords } from "@/lib/customer-linked-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { OrderPaymentStatusBadge } from "@/features/orders/components/order-payment-status-badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

// Part 27: the five customer-facing order groupings. REFUND_PROCESSING is
// folded into "refunded" — from the customer's vantage point a refund in
// flight and a completed one both mean "this order is being refunded," not
// "active."
const FILTERS: { key: string; label: string; statuses: string[] | null }[] = [
  { key: "active", label: "Active", statuses: null },
  { key: "completed", label: "Completed", statuses: ["COMPLETED"] },
  { key: "cancelled", label: "Cancelled", statuses: ["CANCELLED"] },
  { key: "disputed", label: "Disputed", statuses: ["DISPUTED"] },
  { key: "refunded", label: "Refunded", statuses: ["REFUND_PROCESSING", "REFUNDED"] },
];

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED", "DISPUTED", "REFUND_PROCESSING", "REFUNDED"]);

export default async function CustomerOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await auth();
  const { profile } = await requireCustomerContext();
  const linked = await getLinkedCustomerRecords(profile.id);
  const params = await searchParams;
  const filterKey = FILTERS.find((f) => f.key === params.filter)?.key ?? "active";

  if (linked.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Orders</h1>
        <EmptyState icon={ShoppingBag} title="No Orders Yet" description="Orders you place with fashion businesses on Fashion360 will appear here." />
      </div>
    );
  }

  const allOrders = await prisma.order.findMany({
    where: { customerId: { in: linked.map((l) => l.customerId) }, isArchived: false },
    orderBy: { orderDate: "desc" },
    include: {
      business: { select: { name: true, currency: true } },
      items: { select: { designNameSnapshot: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      delivery: { select: { status: true, estimatedDeliveryDate: true } },
    },
  });

  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.key, f.statuses === null ? allOrders.filter((o) => !TERMINAL_STATUSES.has(o.status)).length : allOrders.filter((o) => f.statuses!.includes(o.status)).length])
  );

  const activeFilter = FILTERS.find((f) => f.key === filterKey)!;
  const orders = activeFilter.statuses === null ? allOrders.filter((o) => !TERMINAL_STATUSES.has(o.status)) : allOrders.filter((o) => activeFilter.statuses!.includes(o.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Orders</h1>
        <p className="text-sm text-muted-foreground">Orders across every business you work with on Fashion360.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/account/orders?filter=${f.key}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              f.key === filterKey ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label} <span className="text-xs opacity-80">({counts[f.key]})</span>
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title={`No ${activeFilter.label.toLowerCase()} orders`} description="Orders matching this filter will appear here." />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/account/orders/${order.id}`}>
              <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{order.items[0]?.designNameSnapshot ?? order.orderCode}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.business.name} · {order.orderCode} · {formatDate(order.orderDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    <OrderPaymentStatusBadge status={order.paymentStatus} />
                    {order.delivery && <Badge variant="outline">{order.delivery.status.replace(/_/g, " ")}</Badge>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{formatCurrency(order.totalValue, order.business.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.delivery?.estimatedDeliveryDate
                        ? `Delivery ${formatDate(order.delivery.estimatedDeliveryDate)}`
                        : order.expectedCompletionDate
                          ? `Due ${formatDate(order.expectedCompletionDate)}`
                          : "No due date yet"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
