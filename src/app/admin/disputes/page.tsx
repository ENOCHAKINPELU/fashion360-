import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { getAdminDisputeList, FILTERABLE_STATUSES } from "@/lib/admin-disputes";
import { formatDate } from "@/lib/utils";
import type { DisputeStatus, DisputePriority } from "@prisma/client";

const STATUS_BADGE: Record<DisputeStatus, string> = {
  OPEN: "bg-danger-soft text-danger",
  UNDER_REVIEW: "bg-warning-soft text-warning",
  WAITING_FOR_CUSTOMER: "bg-info-soft text-info",
  WAITING_FOR_DESIGNER: "bg-info-soft text-info",
  ESCALATED: "bg-danger-soft text-danger",
  RESOLVED: "bg-success-soft text-success",
  CLOSED: "bg-muted text-muted-foreground",
};

const PRIORITY_BADGE: Record<DisputePriority, string> = {
  NORMAL: "bg-muted text-muted-foreground",
  HIGH: "bg-warning-soft text-warning",
  URGENT: "bg-danger-soft text-danger",
};

// Admin Phase 9 dispute list — the resolve flow (DisputeResolveForm,
// lib/dispute.ts's resolveDispute) already existed and is untouched; this
// page adds the search/filter/pagination shape every other Admin phase
// already established, plus Priority and Assigned Admin, two concepts the
// dispute model had no way to represent before this phase (see
// lib/admin-disputes.ts).
export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = {
    q: sp.q,
    status: sp.status as DisputeStatus | undefined,
    priority: sp.priority as DisputePriority | undefined,
    unassigned: sp.unassigned === "true",
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    designerId: sp.designerId,
    customerId: sp.customerId,
    page: sp.page ? Number(sp.page) : 1,
  };

  const { disputes, total, page, totalPages } = await getAdminDisputeList(params);

  const hasFilters = !!(params.q || params.status || params.priority || params.unassigned || params.dateFrom || params.dateTo);
  const hasScopeFilter = !!(params.designerId || params.customerId);

  function pageHref(targetPage: number) {
    const next = new URLSearchParams(sp as Record<string, string>);
    next.set("page", String(targetPage));
    return `/admin/disputes?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Disputes</h1>
        <p className="text-sm text-muted-foreground">Payout stays blocked for any order with an open or under-review dispute.</p>
      </div>

      {hasScopeFilter && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2 text-sm">
          <span className="text-muted-foreground">Showing disputes for one {params.designerId ? "designer" : "customer"} only.</span>
          <Link href="/admin/disputes" className="text-xs font-medium text-primary hover:underline">
            Show all disputes
          </Link>
        </div>
      )}

      <form className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        {params.designerId && <input type="hidden" name="designerId" value={params.designerId} />}
        {params.customerId && <input type="hidden" name="customerId" value={params.customerId} />}
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Search by dispute ID, order number, customer, or designer..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {FILTERABLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select name="priority" defaultValue={params.priority ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All priorities</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <label className="flex items-center gap-1.5 px-1 text-sm text-foreground">
            <input type="checkbox" name="unassigned" value="true" defaultChecked={params.unassigned} className="size-4 rounded border-border" />
            Unassigned only
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dateFrom" className="shrink-0 text-xs text-muted-foreground">
              From
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
                href={hasScopeFilter ? `/admin/disputes?${params.designerId ? `designerId=${params.designerId}` : `customerId=${params.customerId}`}` : "/admin/disputes"}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Clear Filters
              </Link>
            )}
          </div>
        </div>
      </form>

      {disputes.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No disputes found" description={hasFilters ? "No disputes match your filters." : "Customer-reported problems will appear here."} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Dispute</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Designer</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assigned</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/disputes/${d.id}`} className="font-mono text-xs font-medium text-foreground hover:underline">
                        {d.id.slice(0, 10)}…
                      </Link>
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
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.issueType.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge className={PRIORITY_BADGE[d.priority]}>{d.priority}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[d.status] ?? "bg-muted text-muted-foreground"}>{d.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.assignedAdminName ?? "Unassigned"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/disputes/${d.id}`}>
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
                Page {page} of {totalPages} · {total} dispute{total === 1 ? "" : "s"}
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
