import Link from "next/link";
import { Truck, AlertTriangle, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { getAdminDeliveryList, getAdminDeliveryStats, getDeliveriesNeedingAttention, STATUS_DISPLAY_LABELS, FILTERABLE_STATUSES } from "@/lib/admin-deliveries";
import { formatDate } from "@/lib/utils";
import type { DeliveryStatus } from "@prisma/client";

const STATUS_BADGE: Record<DeliveryStatus, string> = {
  CREATED: "bg-muted text-muted-foreground",
  COURIER_ASSIGNED: "bg-info-soft text-info",
  PICKUP_SCHEDULED: "bg-info-soft text-info",
  PICKED_UP: "bg-info-soft text-info",
  IN_TRANSIT: "bg-info-soft text-info",
  OUT_FOR_DELIVERY: "bg-warning-soft text-warning",
  DELIVERED: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
  CANCELLED: "bg-muted text-muted-foreground",
  RETURNED: "bg-muted text-muted-foreground",
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

// Admin Phase 8: Delivery & Logistics Management. Platform-wide, read-mostly
// oversight of Delivery — the real logistics model that has driven the
// business's own delivery flow since the delivery/logistics phase of the
// core product, already governed by its own real 10-value lifecycle
// (DeliveryStatus, enforced through lib/delivery.ts's recordDeliveryEvent,
// the one place a Delivery ever changes state, already called from the
// business's own routes and the courier webhook route). This page reuses
// that model, that lifecycle, and this codebase's established list-page
// shape (server-rendered GET form, no client JS needed to search/filter/
// paginate — same as every prior Admin phase) rather than building a second
// logistics system. See lib/admin-deliveries.ts for the delay/issue
// thresholds and the escrow-integration note (this module never touches
// payout eligibility — lib/payout.ts owns that, entirely separately).
export default async function AdminDeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = {
    q: sp.q,
    status: sp.status as DeliveryStatus | undefined,
    courier: sp.courier,
    city: sp.city,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    delayed: sp.delayed === "true",
    returned: sp.returned === "true",
    failed: sp.failed === "true",
    designerId: sp.designerId,
    customerProfileId: sp.customerProfileId,
    page: sp.page ? Number(sp.page) : 1,
  };

  const [stats, { deliveries, total, page, totalPages }, attentionItems] = await Promise.all([
    getAdminDeliveryStats(),
    getAdminDeliveryList(params),
    getDeliveriesNeedingAttention(),
  ]);

  const hasFilters = !!(params.q || params.status || params.courier || params.city || params.dateFrom || params.dateTo || params.delayed || params.returned || params.failed);
  const hasScopeFilter = !!(params.designerId || params.customerProfileId);

  function pageHref(targetPage: number) {
    const next = new URLSearchParams(sp as Record<string, string>);
    next.set("page", String(targetPage));
    return `/admin/deliveries?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Deliveries</h1>
        <p className="text-sm text-muted-foreground">Every shipment on the platform, from dispatch to delivered.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatChip label="Ready for Dispatch" value={stats.readyForDispatch} />
        <StatChip label="Awaiting Pickup" value={stats.awaitingCourierPickup} />
        <StatChip label="In Transit" value={stats.inTransit} />
        <StatChip label="Out for Delivery" value={stats.outForDelivery} />
        <StatChip label="Delivered" value={stats.delivered} />
        <StatChip label="Delayed" value={stats.delayed} />
        <StatChip label="Failed" value={stats.failed} />
        <StatChip label="Returned" value={stats.returned} />
      </div>

      {/* Delay / issue review */}
      {attentionItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Needs Attention</h2>
          <div className="space-y-2">
            {attentionItems.map((item) => (
              <div key={item.deliveryId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning-soft/40 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {item.reason} · <span className="font-mono text-xs text-muted-foreground">{item.orderCode}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.customerName} → {item.designerName} · <span className="italic">{item.recommendedAction}</span>
                    </p>
                  </div>
                </div>
                <Link href={`/admin/deliveries/${item.deliveryId}`}>
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
          <span className="text-muted-foreground">Showing deliveries for one {params.designerId ? "designer" : "customer"} only.</span>
          <Link href="/admin/deliveries" className="text-xs font-medium text-primary hover:underline">
            Show all deliveries
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
          placeholder="Search by delivery ID, tracking number, order number, customer, designer, or courier..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {FILTERABLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_DISPLAY_LABELS[s]}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="courier"
            defaultValue={params.courier}
            placeholder="Courier"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="text"
            name="city"
            defaultValue={params.city}
            placeholder="City"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm text-foreground">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="delayed" value="true" defaultChecked={params.delayed} className="size-4 rounded border-border" />
              Delayed
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="returned" value="true" defaultChecked={params.returned} className="size-4 rounded border-border" />
              Returned
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="failed" value="true" defaultChecked={params.failed} className="size-4 rounded border-border" />
              Failed
            </label>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dateFrom" className="shrink-0 text-xs text-muted-foreground">
              Created from
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
                href={hasScopeFilter ? `/admin/deliveries?${params.designerId ? `designerId=${params.designerId}` : `customerProfileId=${params.customerProfileId}`}` : "/admin/deliveries"}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Clear Filters
              </Link>
            )}
          </div>
        </div>
      </form>

      {deliveries.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No deliveries found"
          description={hasFilters ? "No deliveries match your filters." : "No deliveries have been created yet."}
          action={
            hasFilters ? (
              <Link href="/admin/deliveries">
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
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Designer</th>
                  <th className="px-4 py-3 font-medium">Courier</th>
                  <th className="px-4 py-3 font-medium">Tracking</th>
                  <th className="px-4 py-3 font-medium">Pickup</th>
                  <th className="px-4 py-3 font-medium">Est. Delivery</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last Update</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/deliveries/${d.id}`} className="font-mono text-xs font-medium text-foreground hover:underline">
                        {d.id.slice(0, 10)}…
                      </Link>
                      {d.attention && <AlertTriangle className="ml-1.5 inline size-3.5 text-warning" aria-label={d.attention.reason} />}
                      {d.escalated && <TriangleAlert className="ml-1 inline size-3.5 text-danger" aria-label="Escalated" />}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <Link href={`/admin/orders/${d.orderId}`} className="text-foreground hover:underline">
                        {d.orderCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {d.customerProfileId ? (
                        <Link href={`/admin/customers/${d.customerProfileId}`} className="text-foreground hover:underline">
                          {d.customerName}
                        </Link>
                      ) : (
                        <span className="text-foreground">{d.customerName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <Link href={`/admin/businesses/${d.designerId}`} className="text-foreground hover:underline">
                        {d.designerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.courierName ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.trackingNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.pickedUpAt ? formatDate(d.pickedUpAt) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.estimatedDeliveryDate ? formatDate(d.estimatedDeliveryDate) : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[d.status] ?? "bg-muted text-muted-foreground"}>{STATUS_DISPLAY_LABELS[d.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(d.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/deliveries/${d.id}`}>
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
                Page {page} of {totalPages} · {total} {total === 1 ? "delivery" : "deliveries"}
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
