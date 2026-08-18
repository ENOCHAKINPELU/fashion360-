import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import {
  CheckCircle2,
  AlertTriangle,
  Users,
  Shirt,
  ShoppingBag,
  Inbox,
  History,
  Factory,
  Truck,
  PackageCheck,
  Wallet,
  Banknote,
  UserPlus,
  CreditCard,
  Star,
  ClipboardList,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getAdminDashboardData } from "@/lib/admin-dashboard";
import { AdminQuickActions } from "@/features/admin/components/admin-quick-actions";
import { OrdersByStatusChart } from "@/features/admin/components/charts/orders-by-status-chart";
import { TrendAreaChart } from "@/features/admin/components/charts/trend-area-chart";

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  format = "number",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
  format?: "number" | "currency";
}) {
  return (
    <Link href={href}>
      <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold text-foreground">
              {format === "currency" ? formatCurrency(value, "NGN") : value.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const PRIORITY_STYLE: Record<string, string> = {
  critical: "bg-danger-soft text-danger",
  high: "bg-warning-soft text-warning",
  medium: "bg-info-soft text-info",
};

function AttentionRow({ label, count, priority, href }: { label: string; count: number; priority: string; href: string }) {
  const active = count > 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {active ? (
          <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
        )}
        <span className="text-sm font-medium text-foreground">{label}</span>
        {active && <Badge className={PRIORITY_STYLE[priority]}>{priority}</Badge>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tabular-nums text-foreground">{count}</span>
        <Link href={href}>
          <Button size="sm" variant={active ? "default" : "outline"}>
            {active ? "Review" : "View"}
          </Button>
        </Link>
      </div>
    </div>
  );
}

const ACTIVITY_ICON: Record<string, LucideIcon> = {
  customer: UserPlus,
  designer: Shirt,
  request: Inbox,
  payment: CreditCard,
  review: Star,
  order: ClipboardList,
};

// Admin Phase 2 (Dashboard): expands Phase 1's Overview/Needs
// Attention/Recent Activity into the full brief — 9 real stat cards, 7
// prioritized attention rows each with a real action, quick-action
// shortcuts, 4 minimal charts (dataviz skill: status tokens for the one
// categorical chart, single-hue area charts for the three trends, no
// dual-axis, no fabricated data), and a genuinely unified activity feed
// merged from every model that actually records a timestamped event —
// see lib/admin-dashboard.ts for why that's a merge-and-sort over several
// real tables rather than one broader AuditLog (AuditLog only ever
// captured account/security/moderation events, never "payment received"
// or "order accepted" — extending it to log those would mean touching
// working code across the whole app, which Phase 1's own rule says not to
// do without a real need).
export default async function AdminDashboardPage() {
  const { stats, needsAttention, activity, charts } = await getAdminDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform-wide overview across every business on Fashion360.</p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard icon={Users} label="Total Customers" value={stats.customerCount} href="/admin/customers" />
          <StatCard icon={Shirt} label="Total Designers" value={stats.designerCount} href="/admin/businesses" />
          <StatCard icon={Inbox} label="Pending Requests" value={stats.pendingRequestCount} href="/admin/requests" />
          <StatCard icon={ShoppingBag} label="Active Orders" value={stats.activeOrderCount} href="/admin/orders" />
          <StatCard icon={Factory} label="Orders in Production" value={stats.inProductionCount} href="/admin/orders" />
          <StatCard icon={Truck} label="Orders in Delivery" value={stats.inDeliveryCount} href="/admin/deliveries" />
          <StatCard icon={PackageCheck} label="Completed Orders" value={stats.completedOrderCount} href="/admin/orders" />
          <StatCard icon={Banknote} label="Total Revenue Processed" value={stats.totalRevenue} href="/admin/transactions" format="currency" />
          <StatCard icon={Wallet} label="Pending Payouts" value={stats.pendingPayoutAmount} href="/admin/payouts" format="currency" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Needs Attention</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {needsAttention.map((item) => (
            <AttentionRow key={item.label} label={item.label} count={item.count} priority={item.priority} href={item.href} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Quick Actions</h2>
        <AdminQuickActions />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Trends</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Orders by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <OrdersByStatusChart data={charts.ordersByStatus} />
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendAreaChart data={charts.revenueTrend} kind="revenue" valueLabel="Revenue" currency="NGN" />
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Customer Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendAreaChart data={charts.customerGrowth} kind="customers" valueLabel="New customers" />
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Designer Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendAreaChart data={charts.designerGrowth} kind="designers" valueLabel="New designers" />
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Recent Activity</h2>
          <Link href="/admin/activity" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {activity.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" description="Data will appear here as Fashion360 activity grows." />
        ) : (
          <div className="space-y-2">
            {activity.map((item) => {
              const Icon = ACTIVITY_ICON[item.kind] ?? History;
              return (
                <Link key={item.id} href={item.href}>
                  <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary">
                          <Icon className="size-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">{item.description}</p>
                          {item.sub && <p className="truncate text-xs text-muted-foreground">{item.sub}</p>}
                        </div>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">{formatDate(item.timestamp)}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
