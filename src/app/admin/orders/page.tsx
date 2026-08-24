import Link from "next/link";
import { ShoppingBag, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { getAdminOrderList, getAdminOrderStats, getOrdersNeedingAttention } from "@/lib/admin-orders";
import { orderStatusOptions, orderPaymentStatusOptions, orderPriorityOptions } from "@/lib/validations/order";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OrderStatus, OrderPaymentStatus, OrderPriority, DeliveryStatus } from "@prisma/client";

const DELIVERY_STATUS_OPTIONS: { value: DeliveryStatus; label: string }[] = [
  { value: "CREATED", label: "Created" },
  { value: "COURIER_ASSIGNED", label: "Courier Assigned" },
  { value: "PICKUP_SCHEDULED", label: "Pickup Scheduled" },
  { value: "PICKED_UP", label: "Picked Up" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "RETURNED", label: "Returned" },
];

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_CONFIRMATION: "bg-warning-soft text-warning",
  CONFIRMED: "bg-info-soft text-info",
  AWAITING_PAYMENT: "bg-warning-soft text-warning",
  READY_FOR_PRODUCTION: "bg-info-soft text-info",
  IN_PRODUCTION: "bg-info-soft text-info",
  FITTING: "bg-info-soft text-info",
  ALTERATION: "bg-warning-soft text-warning",
  FINAL_INSPECTION: "bg-info-soft text-info",
  QUALITY_CHECK: "bg-info-soft text-info",
  QUALITY_CHECK_FAILED: "bg-danger-soft text-danger",
  COMPLETED: "bg-success-soft text-success",
  READY_FOR_PICKUP: "bg-success-soft text-success",
  OUT_FOR_DELIVERY: "bg-success-soft text-success",
  IN_TRANSIT: "bg-success-soft text-success",
  DELIVERED: "bg-success-soft text-success",
  CANCELLED: "bg-muted text-muted-foreground",
  ON_HOLD: "bg-warning-soft text-warning",
  DISPUTED: "bg-danger-soft text-danger",
  REFUND_PROCESSING: "bg-danger-soft text-danger",
  REFUNDED: "bg-muted text-muted-foreground",
};

const PRIORITY_BADGE: Record<string, string> = {
  NORMAL: "bg-muted text-muted-foreground",
  HIGH: "bg-warning-soft text-warning",
  URGENT: "bg-danger-soft text-danger",
};

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6">
        <p className="text-xl font-semibold text-foreground tabular-nums">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// Admin Phase 6: Order Management. Platform-wide, read-mostly oversight of
// Order — the real order model that has driven the business's own order
// board/detail pages since Phase 2 of the core product, already governed by
// its own real 21-value lifecycle (OrderStatus). This page reuses that
// model, that lifecycle, and this codebase's established list-page shape
// (server-rendered GET form, no client JS needed to search/filter/paginate
// — same as /admin/customers, /admin/businesses, /admin/requests) rather
// than building a second order system. See lib/admin-orders.ts for the
// stuck-order thresholds and why almost no schema changes were needed —
// Order Items, Production, Timeline, Files, Notes, and Audit History were
// all already real, populated models before this phase touched anything.
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = {
    q: sp.q,
    status: sp.status as OrderStatus | undefined,
    paymentStatus: sp.paymentStatus as OrderPaymentStatus | undefined,
    deliveryStatus: sp.deliveryStatus as DeliveryStatus | undefined,
    priority: sp.priority as OrderPriority | undefined,
    inProduction: sp.inProduction === "true",
    city: sp.city,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    highValue: sp.highValue === "true",
    delayed: sp.delayed === "true",
    needsAttention: sp.needsAttention === "true",
    designerId: sp.designerId,
    customerProfileId: sp.customerProfileId,
    page: sp.page ? Number(sp.page) : 1,
  };

  const [stats, { orders, total, page, totalPages }, attentionItems] = await Promise.all([
    getAdminOrderStats(),
    getAdminOrderList(params),
    getOrdersNeedingAttention(),
  ]);

  const hasFilters = !!(
    params.q ||
    params.status ||
    params.paymentStatus ||
    params.deliveryStatus ||
    params.priority ||
    params.inProduction ||
    params.city ||
    params.dateFrom ||
    params.dateTo ||
    params.highValue ||
    params.delayed ||
    params.needsAttention
  );
  const hasScopeFilter = !!(params.designerId || params.customerProfileId);

  function pageHref(targetPage: number) {
    const next = new URLSearchParams(sp as Record<string, string>);
    next.set("page", String(targetPage));
    return `/admin/orders?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground">Platform-wide order oversight and monitoring.</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatChip label="Total" value={stats.total} />
        <StatChip label="In Production" value={stats.inProduction} />
        <StatChip label="Awaiting Payment" value={stats.awaitingPayment} />
        <StatChip label="Ready" value={stats.ready} />
        <StatChip label="In Delivery" value={stats.inDelivery} />
        <StatChip label="Completed" value={stats.completed} />
        <StatChip label="Cancelled" value={stats.cancelled} />
        <StatChip label="Delayed" value={stats.delayed} />
      </div>

      {/* Needs Attention */}
      {attentionItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Needs Attention</h2>
          <div className="space-y-2">
            {attentionItems.map((item) => (
              <div key={item.orderId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning-soft/40 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {item.reason} · <span className="font-mono text-xs text-muted-foreground">{item.orderCode}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.customerName} → {item.designerName}
                    </p>
                  </div>
                </div>
                <Link href={`/admin/orders/${item.orderId}`}>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasScopeFilter && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2 text-sm">
          <span className="text-muted-foreground">Showing orders for one {params.designerId ? "designer" : "customer"} only.</span>
          <Link href="/admin/orders" className="text-xs font-medium text-primary hover:underline">
            Show all orders
          </Link>
        </div>
      )}

      <form className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        {params.designerId && <input type="hidden" name="designerId" value={params.designerId} />}
        {params.customerProfileId && <input type="hidden" name="customerProfileId" value={params.customerProfileId} />}
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Search by order number, customer, designer, phone, or email..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {orderStatusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select name="paymentStatus" defaultValue={params.paymentStatus ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All payment statuses</option>
            {orderPaymentStatusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select name="deliveryStatus" defaultValue={params.deliveryStatus ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All delivery statuses</option>
            {DELIVERY_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select name="priority" defaultValue={params.priority ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All priorities</option>
            {orderPriorityOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            name="city"
            defaultValue={params.city}
            placeholder="City"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm text-foreground">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="inProduction" value="true" defaultChecked={params.inProduction} className="size-4 rounded border-border" />
              In production
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="highValue" value="true" defaultChecked={params.highValue} className="size-4 rounded border-border" />
              High value
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm text-foreground">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="delayed" value="true" defaultChecked={params.delayed} className="size-4 rounded border-border" />
              Delayed
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="needsAttention" value="true" defaultChecked={params.needsAttention} className="size-4 rounded border-border" />
              Needs attention
            </label>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dateFrom" className="shrink-0 text-xs text-muted-foreground">
              Ordered from
            </label>
            <input id="dateFrom" type="date" name="dateFrom" defaultValue={params.dateFrom} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="dateTo" className="shrink-0 text-xs text-muted-foreground">
              to
            </label>
            <input id="dateTo" type="date" name="dateTo" defaultValue={params.dateTo} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">
              Apply Filters
            </Button>
            {hasFilters && (
              <Link
                href={hasScopeFilter ? `/admin/orders?${params.designerId ? `designerId=${params.designerId}` : `customerProfileId=${params.customerProfileId}`}` : "/admin/orders"}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Clear Filters
              </Link>
            )}
          </div>
        </div>
      </form>

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders found"
          description={hasFilters ? "No orders match your filters." : "No orders have been placed yet."}
          action={
            hasFilters ? (
              <Link href="/admin/orders">
                <Button size="sm" variant="outline">
                  Clear Filters
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[1400px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Designer</th>
                  <th className="px-4 py-3 font-medium">Garment</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 text-right font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Expected</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-foreground hover:underline">
                        {o.orderCode}
                      </Link>
                      {o.attention && <AlertTriangle className="ml-1.5 inline size-3.5 text-warning" aria-label={o.attention.reason} />}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {o.customerProfileId ? (
                        <Link href={`/admin/customers/${o.customerProfileId}`} className="text-foreground hover:underline">
                          {o.customerName}
                        </Link>
                      ) : (
                        <span className="text-foreground">{o.customerName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <Link href={`/admin/businesses/${o.designerId}`} className="text-foreground hover:underline">
                        {o.designerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {o.garmentType}
                      {o.extraItemCount > 0 && ` +${o.extraItemCount}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(o.orderDate)}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[o.status] ?? "bg-muted text-muted-foreground"}>{o.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{o.paymentStatus.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{o.deliveryStatus ? o.deliveryStatus.replace(/_/g, " ") : "Not yet"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(o.totalValue, "NGN")}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{o.expectedCompletionDate ? formatDate(o.expectedCompletionDate) : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={PRIORITY_BADGE[o.priority] ?? PRIORITY_BADGE.NORMAL}>{o.priority}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.id}`}>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {total} order{total === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={pageHref(page - 1)}>
                    <Button size="sm" variant="outline">
                      Previous
                    </Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={pageHref(page + 1)}>
                    <Button size="sm" variant="outline">
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
