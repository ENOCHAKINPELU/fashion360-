import Link from "next/link";
import { Building2, ShieldQuestion, Ban, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { getAdminDesignerList } from "@/lib/admin-designers";
import { AdminDesignerActions } from "@/features/admin/components/admin-designer-actions";
import { formatCurrency, formatDate } from "@/lib/utils";

const VERIFICATION_BADGE: Record<string, { label: string; className: string }> = {
  UNVERIFIED: { label: "Unverified", className: "bg-muted text-muted-foreground" },
  PENDING: { label: "Pending", className: "bg-warning-soft text-warning" },
  VERIFIED: { label: "Verified", className: "bg-success-soft text-success" },
  REJECTED: { label: "Rejected", className: "bg-danger-soft text-danger" },
  SUSPENDED: { label: "Suspended", className: "bg-danger-soft text-danger" },
};

// Admin Phase 4: the same rebuild Phase 3 did for /admin/customers, applied
// to designers — real data table with every required column, server-side
// search + all 8 filters via plain GET searchParams, pagination. See
// lib/admin-designers.ts for the aggregate filters (Most Active) that need
// GROUP BY ... HAVING on Order, same reasoning as Phase 3's Repeat
// Customers filter.
export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = {
    q: sp.q,
    verification: sp.verification as "pending" | "verified" | "suspended" | undefined,
    topRated: sp.topRated === "true",
    mostActive: sp.mostActive === "true",
    noOrders: sp.noOrders === "true",
    lowRatings: sp.lowRatings === "true",
    location: sp.location,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    page: sp.page ? Number(sp.page) : 1,
  };

  const { designers, total, page, totalPages } = await getAdminDesignerList(params);

  const hasFilters = !!(
    params.q ||
    params.verification ||
    params.topRated ||
    params.mostActive ||
    params.noOrders ||
    params.lowRatings ||
    params.location ||
    params.dateFrom ||
    params.dateTo
  );

  function pageHref(targetPage: number) {
    const next = new URLSearchParams(sp as Record<string, string>);
    next.set("page", String(targetPage));
    return `/admin/businesses?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Designers</h1>
        <p className="text-sm text-muted-foreground">
          {total} designer{total === 1 ? "" : "s"} on the platform.
        </p>
      </div>

      <form className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Search by business name, owner name, email, phone, or designer ID..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select name="verification" defaultValue={params.verification ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All verification statuses</option>
            <option value="pending">Pending verification</option>
            <option value="verified">Verified</option>
            <option value="suspended">Suspended</option>
          </select>
          <input
            type="text"
            name="location"
            defaultValue={params.location}
            placeholder="Location (city or country)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm text-foreground">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="topRated" value="true" defaultChecked={params.topRated} className="size-4 rounded border-border" />
              Top rated
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="mostActive" value="true" defaultChecked={params.mostActive} className="size-4 rounded border-border" />
              Most active
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm text-foreground">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="noOrders" value="true" defaultChecked={params.noOrders} className="size-4 rounded border-border" />
              No orders
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="lowRatings" value="true" defaultChecked={params.lowRatings} className="size-4 rounded border-border" />
              Low ratings
            </label>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dateFrom" className="shrink-0 text-xs text-muted-foreground">
              Registered from
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
              <Link href="/admin/businesses" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                Clear all
              </Link>
            )}
          </div>
        </div>
      </form>

      {designers.length === 0 ? (
        <EmptyState icon={Building2} title="No designers found" description={hasFilters ? "No designers match these filters." : "No designers have signed up yet."} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Designer</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Verification</th>
                  <th className="px-4 py-3 text-right font-medium">Completed</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  <th className="px-4 py-3 font-medium">Registered</th>
                  <th className="px-4 py-3 font-medium">Last Active</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {designers.map((d) => {
                  const verification = VERIFICATION_BADGE[d.verificationStatus] ?? VERIFICATION_BADGE.UNVERIFIED;
                  const suspended = d.verificationStatus === "SUSPENDED";
                  return (
                    <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link href={`/admin/businesses/${d.id}`} className="font-medium text-foreground hover:underline">
                          {d.businessName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{d.ownerName ?? "No owner on file"}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{d.id}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <p>{d.email ?? "—"}</p>
                        <p>{d.phone ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{[d.city, d.country].filter(Boolean).join(", ") || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge className={verification.className}>{verification.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{d.completedOrderCount}</td>
                      <td className="px-4 py-3">
                        {d.totalReviews > 0 ? (
                          <span className="flex items-center gap-1 tabular-nums">
                            <Star className="size-3.5 fill-warning text-warning" /> {d.averageRating.toFixed(1)}{" "}
                            <span className="text-xs text-muted-foreground">({d.totalReviews})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No reviews</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(d.revenueGenerated, "NGN")}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(d.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{d.lastActiveAt ? formatDate(d.lastActiveAt) : "Never logged in"}</td>
                      <td className="px-4 py-3">
                        {suspended ? (
                          <Badge className="gap-1 bg-danger-soft text-danger">
                            <Ban className="size-3" /> Suspended
                          </Badge>
                        ) : (
                          <Badge className="gap-1 bg-success-soft text-success">
                            <ShieldQuestion className="size-3" /> Active
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/businesses/${d.id}`}>
                            <Button size="sm" variant="ghost">
                              View
                            </Button>
                          </Link>
                          <AdminDesignerActions businessId={d.id} suspended={suspended} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages}
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
