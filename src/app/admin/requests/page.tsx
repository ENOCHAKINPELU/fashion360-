import Link from "next/link";
import { Inbox, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { ServiceRequestStatusBadge } from "@/features/discover/components/service-request-status-badge";
import { getAdminRequestList, getAdminRequestStats, getRequestsNeedingAttention, formatDuration, FILTERABLE_STATUSES } from "@/lib/admin-requests";
import { formatDate } from "@/lib/utils";
import type { ServiceRequestStatus } from "@prisma/client";

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  RECEIVED: "Received",
  UNDER_REVIEW: "Under Review",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  CONVERTED_TO_APPOINTMENT: "Converted to Appointment",
  CONVERTED_TO_ORDER: "Converted to Order",
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

// Admin Phase 5: Request Management. Platform-wide, read-mostly oversight
// of ServiceRequest — the real customer-to-designer request model that has
// existed since Part 11, already governed by its own real lifecycle
// (ServiceRequestStatus) and already enforced by the customer/business
// request flows. This page reuses that model, that lifecycle, and this
// codebase's established list-page shape (server-rendered GET form, no
// client JS needed to search/filter/paginate — same as /admin/customers and
// /admin/businesses) rather than building a second request system. See
// lib/admin-requests.ts for the stuck-request thresholds and why no schema
// changes were needed (every field the brief asks for already exists).
export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = {
    q: sp.q,
    status: sp.status as ServiceRequestStatus | undefined,
    service: sp.service,
    location: sp.location,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    needsAttention: sp.needsAttention === "true",
    designerId: sp.designerId,
    customerId: sp.customerId,
    page: sp.page ? Number(sp.page) : 1,
  };

  const [stats, { requests, total, page, totalPages }, attentionItems] = await Promise.all([
    getAdminRequestStats(),
    getAdminRequestList(params),
    getRequestsNeedingAttention(),
  ]);

  const hasFilters = !!(params.q || params.status || params.service || params.location || params.dateFrom || params.dateTo || params.needsAttention);
  const hasScopeFilter = !!(params.designerId || params.customerId);

  function pageHref(targetPage: number) {
    const next = new URLSearchParams(sp as Record<string, string>);
    next.set("page", String(targetPage));
    return `/admin/requests?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Requests</h1>
        <p className="text-sm text-muted-foreground">Platform-wide oversight of customer service requests.</p>
      </div>

      {/* Metrics (#17) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatChip label="Total" value={stats.total} />
        <StatChip label="Pending" value={stats.pending} />
        <StatChip label="Accepted" value={stats.accepted} />
        <StatChip label="In Progress" value={stats.inProgress} />
        <StatChip label="Completed" value={stats.completed} />
        <StatChip label="Rejected" value={stats.rejected} />
        <StatChip label="Cancelled" value={stats.cancelled} />
        <StatChip label="Needs Attention" value={stats.needsAttention} />
      </div>

      {/* Needs Attention (#13) */}
      {attentionItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Needs Attention</h2>
          <div className="space-y-2">
            {attentionItems.map((item) => (
              <div key={item.requestId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning-soft/40 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {item.reason} · <span className="font-mono text-xs text-muted-foreground">{item.requestCode}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.customerName} → {item.designerName}
                    </p>
                  </div>
                </div>
                <Link href={`/admin/requests/${item.requestId}`}>
                  <Button size="sm" variant="outline">
                    View Request
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasScopeFilter && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2 text-sm">
          <span className="text-muted-foreground">Showing requests for one {params.designerId ? "designer" : "customer"} only.</span>
          <Link href="/admin/requests" className="text-xs font-medium text-primary hover:underline">
            Show all requests
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
          placeholder="Search by request ID, customer name or email, designer name, or service..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {FILTERABLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="service"
            defaultValue={params.service}
            placeholder="Service"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="text"
            name="location"
            defaultValue={params.location}
            placeholder="Location (city or country)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <label className="flex items-center gap-1.5 px-1 text-sm text-foreground">
            <input type="checkbox" name="needsAttention" value="true" defaultChecked={params.needsAttention} className="size-4 rounded border-border" />
            Needs attention only
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dateFrom" className="shrink-0 text-xs text-muted-foreground">
              Submitted from
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
              <Link href={hasScopeFilter ? `/admin/requests?${params.designerId ? `designerId=${params.designerId}` : `customerId=${params.customerId}`}` : "/admin/requests"} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                Clear Filters
              </Link>
            )}
          </div>
        </div>
      </form>

      {requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No requests found"
          description={hasFilters ? "No requests match your filters." : "No service requests have been submitted yet."}
          action={
            hasFilters ? (
              <Link href="/admin/requests">
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
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Request</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Designer</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Last Updated</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Waiting</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/requests/${r.id}`} className="font-medium text-foreground hover:underline">
                        {r.requestCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <Link href={`/admin/customers/${r.customerId}`} className="text-foreground hover:underline">
                        {r.customerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <Link href={`/admin/businesses/${r.designerId}`} className="text-foreground hover:underline">
                        {r.designerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.serviceName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <ServiceRequestStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{r.isTerminal ? "—" : formatDuration(r.updatedAt)}</td>
                    <td className="px-4 py-3">
                      {r.attention ? (
                        <Badge className="gap-1 bg-warning-soft text-warning" title={r.attention.reason}>
                          <AlertTriangle className="size-3" /> High
                        </Badge>
                      ) : (
                        <Badge variant="outline">Normal</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/requests/${r.id}`}>
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
                Page {page} of {totalPages} · {total} request{total === 1 ? "" : "s"}
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
