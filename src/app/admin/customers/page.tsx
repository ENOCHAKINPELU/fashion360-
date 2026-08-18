import Link from "next/link";
import { Users, ShieldCheck, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { getAdminCustomerList } from "@/lib/admin-customers";
import { AdminCustomerActions } from "@/features/admin/components/admin-customer-actions";
import { formatCurrency, formatDate } from "@/lib/utils";

// Admin Phase 3: a real data table (was a card list in Phase 2) with
// server-side search, filtering, and pagination — every filter is a real
// `where` condition (two of them, Repeat/High Value, resolve through a
// GROUP BY ... HAVING on Order first, since Prisma can't express "count >=
// 2" as a plain relation filter — see lib/admin-customers.ts). A plain GET
// form, no client state: the URL is the source of truth for every filter,
// so the page is shareable/bookmarkable and needs no client JS to work.
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = {
    q: sp.q,
    status: sp.status as "active" | "suspended" | undefined,
    orders: sp.orders as "none" | "repeat" | undefined,
    highValue: sp.highValue === "true",
    newOnly: sp.newOnly === "true",
    location: sp.location,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    page: sp.page ? Number(sp.page) : 1,
  };

  const { customers, total, page, totalPages } = await getAdminCustomerList(params);

  const hasFilters = !!(params.q || params.status || params.orders || params.highValue || params.newOnly || params.location || params.dateFrom || params.dateTo);

  function pageHref(targetPage: number) {
    const next = new URLSearchParams(sp as Record<string, string>);
    next.set("page", String(targetPage));
    return `/admin/customers?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">
          {total} customer{total === 1 ? "" : "s"} on the platform.
        </p>
      </div>

      <form className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Search by name, email, phone, or customer ID..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select name="orders" defaultValue={params.orders ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All order history</option>
            <option value="none">No orders</option>
            <option value="repeat">Repeat customers (2+ orders)</option>
          </select>
          <input
            type="text"
            name="location"
            defaultValue={params.location}
            placeholder="Location (city or country)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex items-center gap-4 px-1 text-sm text-foreground">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="highValue" value="true" defaultChecked={params.highValue} className="size-4 rounded border-border" />
              High value
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="newOnly" value="true" defaultChecked={params.newOnly} className="size-4 rounded border-border" />
              New (30d)
            </label>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dateFrom" className="shrink-0 text-xs text-muted-foreground">
              Registered from
            </label>
            <input
              id="dateFrom"
              type="date"
              name="dateFrom"
              defaultValue={params.dateFrom}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="dateTo" className="shrink-0 text-xs text-muted-foreground">
              to
            </label>
            <input
              id="dateTo"
              type="date"
              name="dateTo"
              defaultValue={params.dateTo}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">
              Apply Filters
            </Button>
            {hasFilters && (
              <Link href="/admin/customers" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                Clear all
              </Link>
            )}
          </div>
        </div>
      </form>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description={hasFilters ? "No customers match these filters." : "No customers have signed up yet."}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">Registered</th>
                  <th className="px-4 py-3 text-right font-medium">Orders</th>
                  <th className="px-4 py-3 text-right font-medium">Requests</th>
                  <th className="px-4 py-3 text-right font-medium">Total Spend</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last Active</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/customers/${c.id}`} className="font-medium text-foreground hover:underline">
                        {c.name ?? "Unnamed customer"}
                      </Link>
                      <p className="font-mono text-[11px] text-muted-foreground">{c.id}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <p>{c.email}</p>
                      <p>{c.phone ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{[c.city, c.country].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.orderCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.requestCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.totalSpend, "NGN")}</td>
                    <td className="px-4 py-3">
                      {c.suspendedAt ? (
                        <Badge className="gap-1 bg-danger-soft text-danger">
                          <Ban className="size-3" /> Suspended
                        </Badge>
                      ) : (
                        <Badge className="gap-1 bg-success-soft text-success">
                          <ShieldCheck className="size-3" /> Active
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.lastActiveAt ? formatDate(c.lastActiveAt) : "Never logged in"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/customers/${c.id}`}>
                          <Button size="sm" variant="ghost">
                            View
                          </Button>
                        </Link>
                        <AdminCustomerActions customerId={c.id} suspended={!!c.suspendedAt} />
                      </div>
                    </td>
                  </tr>
                ))}
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
