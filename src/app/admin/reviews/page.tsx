import Link from "next/link";
import { Star, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { AdminReviewModerationClient } from "@/features/admin/components/admin-review-moderation-client";
import { getAdminReviewList, getAdminTrustSafetyStats, getReviewAbuseSignals } from "@/lib/admin-reviews";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import type { ReviewStatus } from "@prisma/client";

const STATUS_BADGE: Record<string, string> = {
  PENDING_MODERATION: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-success-soft text-success",
  REJECTED: "bg-danger-soft text-danger",
  FLAGGED: "bg-warning-soft text-warning",
  HIDDEN: "bg-muted text-muted-foreground",
  REMOVED: "bg-muted text-muted-foreground",
};

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6">
        <p className="text-xl font-semibold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`size-3.5 ${i < rating ? "fill-warning text-warning" : "text-border"}`} />
      ))}
    </span>
  );
}

// Admin Phase 9: Reviews, Ratings & Disputes Management (reviews half).
// The moderation backend (lib/reviews.ts) and this page's own moderation
// queue (AdminReviewModerationClient — flagged reviews, pending reports,
// pending deletion requests) already existed and are reused untouched
// below. What's new: the platform-wide dashboard, abuse detection, and a
// full searchable/filterable/paginated table of every review — there was
// previously no way to browse a review that wasn't already flagged or
// reported. See lib/admin-reviews.ts for the full audit.
export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = {
    q: sp.q,
    rating: sp.rating ? Number(sp.rating) : undefined,
    status: sp.status as ReviewStatus | undefined,
    reported: sp.reported === "true",
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    designerId: sp.designerId,
    customerId: sp.customerId,
    page: sp.page ? Number(sp.page) : 1,
  };

  const [stats, abuseSignals, { reviews, total, page, totalPages }, flaggedReviews, reports, deletionRequests] = await Promise.all([
    getAdminTrustSafetyStats(),
    getReviewAbuseSignals(),
    getAdminReviewList(params),
    prisma.review.findMany({
      where: { status: { in: ["FLAGGED", "PENDING_MODERATION"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { business: { select: { id: true, name: true } }, customerProfile: { select: { id: true, username: true } }, reports: { where: { status: "PENDING" } } },
    }),
    prisma.reviewReport.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { review: { select: { id: true, bodyText: true, overallRating: true, status: true, businessId: true } } },
    }),
    prisma.reviewDeletionRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "desc" },
      include: { review: { select: { id: true, bodyText: true, overallRating: true, businessId: true, createdAt: true } } },
    }),
  ]);

  const serialized = JSON.parse(JSON.stringify({ flaggedReviews, reports, deletionRequests }));

  const hasFilters = !!(params.q || params.rating || params.status || params.reported || params.dateFrom || params.dateTo);
  const hasScopeFilter = !!(params.designerId || params.customerId);

  function pageHref(targetPage: number) {
    const next = new URLSearchParams(sp as Record<string, string>);
    next.set("page", String(targetPage));
    return `/admin/reviews?${next.toString()}`;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reviews &amp; Trust</h1>
        <p className="text-sm text-muted-foreground">Every review, moderation decision, and abuse signal on the platform.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatChip label="Total Reviews" value={String(stats.totalReviews)} />
        <StatChip label="Avg Platform Rating" value={stats.averagePlatformRating.toFixed(2)} />
        <StatChip label="Pending Disputes" value={String(stats.pendingDisputes)} />
        <StatChip label="Resolved Disputes" value={String(stats.resolvedDisputes)} />
        <StatChip label="Flagged Reviews" value={String(stats.flaggedReviews)} />
        <StatChip label="Hidden Reviews" value={String(stats.hiddenReviews)} />
        <StatChip label="Top Rated" value={stats.topRatedDesigners[0]?.designerName ?? "—"} />
        <StatChip label="Low Rated" value={stats.lowRatedDesigners[0]?.designerName ?? "—"} />
      </div>

      {/* Top/Low rated designers */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-2 pt-6">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Top Rated Designers</p>
            {stats.topRatedDesigners.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enough reviews yet.</p>
            ) : (
              stats.topRatedDesigners.map((d) => (
                <div key={d.designerId} className="flex items-center justify-between text-sm">
                  <Link href={`/admin/businesses/${d.designerId}`} className="text-foreground hover:underline">
                    {d.designerName}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">
                    {d.averageRating.toFixed(2)} ★ ({d.totalReviews})
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-2 pt-6">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Low Rated Designers</p>
            {stats.lowRatedDesigners.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enough reviews yet.</p>
            ) : (
              stats.lowRatedDesigners.map((d) => (
                <div key={d.designerId} className="flex items-center justify-between text-sm">
                  <Link href={`/admin/businesses/${d.designerId}`} className="text-foreground hover:underline">
                    {d.designerName}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">
                    {d.averageRating.toFixed(2)} ★ ({d.totalReviews})
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Abuse detection */}
      {abuseSignals.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-danger uppercase">
            <ShieldAlert className="size-3.5" /> Abuse Detection
          </h2>
          <div className="space-y-2">
            {abuseSignals.slice(0, 10).map((s, i) => (
              <div key={`${s.category}-${s.subjectId}-${i}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger-soft/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.reason}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.subjectType === "customer" ? "Customer" : "Designer"}: {s.subjectLabel}
                  </p>
                </div>
                <Link href={s.subjectType === "designer" ? `/admin/businesses/${s.subjectId}` : `/admin/customers/${s.subjectId}`}>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Moderation queue — reports & deletion requests (pre-existing) */}
      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Moderation Queue</h2>
        <AdminReviewModerationClient flaggedReviews={serialized.flaggedReviews} reports={serialized.reports} deletionRequests={serialized.deletionRequests} />
      </section>

      {/* Full reviews table */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">All Reviews</h2>

        {hasScopeFilter && (
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2 text-sm">
            <span className="text-muted-foreground">Showing reviews for one {params.designerId ? "designer" : "customer"} only.</span>
            <Link href="/admin/reviews" className="text-xs font-medium text-primary hover:underline">
              Show all reviews
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
            placeholder="Search by review ID, order number, customer, or designer..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select name="rating" defaultValue={params.rating ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">All ratings</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} star{r === 1 ? "" : "s"}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">All statuses</option>
              <option value="PUBLISHED">Visible</option>
              <option value="FLAGGED">Flagged</option>
              <option value="HIDDEN">Hidden</option>
              <option value="PENDING_MODERATION">Pending Moderation</option>
              <option value="REJECTED">Rejected</option>
              <option value="REMOVED">Removed</option>
            </select>
            <label className="flex items-center gap-1.5 px-1 text-sm text-foreground">
              <input type="checkbox" name="reported" value="true" defaultChecked={params.reported} className="size-4 rounded border-border" />
              Reported only
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
                  href={hasScopeFilter ? `/admin/reviews?${params.designerId ? `designerId=${params.designerId}` : `customerId=${params.customerId}`}` : "/admin/reviews"}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  Clear Filters
                </Link>
              )}
            </div>
          </div>
        </form>

        {reviews.length === 0 ? (
          <EmptyState icon={Star} title="No reviews found" description={hasFilters ? "No reviews match your filters." : "No reviews have been submitted yet."} />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                    <th className="px-4 py-3 font-medium">Review</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Designer</th>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Rating</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Flagged</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link href={`/admin/reviews/${r.id}`} className="font-mono text-xs font-medium text-foreground hover:underline">
                          {r.id.slice(0, 10)}…
                        </Link>
                        {r.reportCount > 0 && (
                          <Badge variant="outline" className="ml-1.5">
                            {r.reportCount} report{r.reportCount === 1 ? "" : "s"}
                          </Badge>
                        )}
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
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <Link href={`/admin/orders/${r.orderId}`} className="text-foreground hover:underline">
                          {r.orderCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Stars rating={r.overallRating} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_BADGE[r.status] ?? "bg-muted text-muted-foreground"}>{r.status.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="px-4 py-3">{r.flagged ? <Badge className="bg-warning-soft text-warning">Yes</Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/reviews/${r.id}`}>
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
                  Page {page} of {totalPages} · {total} review{total === 1 ? "" : "s"}
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
      </section>
    </div>
  );
}
