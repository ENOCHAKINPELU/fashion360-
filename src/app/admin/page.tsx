import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { CheckCircle2, AlertTriangle, Users, Shirt, ShoppingBag, Inbox, History } from "lucide-react";
import { formatDate } from "@/lib/utils";

const ORDER_INACTIVE_STATUSES = ["CANCELLED", "COMPLETED"] as const;
const REQUEST_TERMINAL_STATUSES = ["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED", "CONVERTED_TO_APPOINTMENT", "CONVERTED_TO_ORDER"] as const;

function StatCard({ icon: Icon, label, value, href }: { icon: LucideIcon; label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-foreground">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AttentionRow({ label, count, href }: { label: string; count: number; href: string }) {
  const needsAttention = count > 0;
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-muted"
    >
      <div className="flex items-center gap-2.5">
        {needsAttention ? (
          <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
        )}
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <Badge variant={needsAttention ? "default" : "outline"} className={needsAttention ? "bg-warning-soft text-warning hover:bg-warning-soft" : ""}>
        {count}
      </Badge>
    </Link>
  );
}

// Phase 1's Dashboard structure (AGENTS.md Admin brief §9): Overview,
// Needs Attention, Recent Activity. Every number here is a real aggregate
// query against models that already exist — never a fabricated stat. Where
// a bucket links somewhere not yet built (Requests, Deliveries), the count
// is still real; only the destination page is a Phase-1 placeholder.
export default async function AdminDashboardPage() {
  const [
    customerCount,
    designerCount,
    activeOrderCount,
    pendingRequestCount,
    paymentIssueCount,
    deliveryIssueCount,
    openDisputeCount,
    recentActivity,
  ] = await Promise.all([
    prisma.customerProfile.count(),
    prisma.business.count(),
    prisma.order.count({ where: { status: { notIn: [...ORDER_INACTIVE_STATUSES] } } }),
    prisma.serviceRequest.count({ where: { status: { notIn: [...REQUEST_TERMINAL_STATUSES] } } }),
    prisma.payment.count({ where: { status: { in: ["FAILED", "AMOUNT_MISMATCH"] } } }),
    prisma.delivery.count({ where: { status: "FAILED" } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true, email: true } }, business: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform-wide overview across every business on Fashion360.</p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Customers" value={customerCount} href="/admin/customers" />
          <StatCard icon={Shirt} label="Designers" value={designerCount} href="/admin/businesses" />
          <StatCard icon={ShoppingBag} label="Active Orders" value={activeOrderCount} href="/admin/orders" />
          <StatCard icon={Inbox} label="Pending Requests" value={pendingRequestCount} href="/admin/requests" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Needs Attention</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <AttentionRow label="Pending requests awaiting a response" count={pendingRequestCount} href="/admin/requests" />
          <AttentionRow label="Payment issues (failed or mismatched)" count={paymentIssueCount} href="/admin/payouts" />
          <AttentionRow label="Delivery issues" count={deliveryIssueCount} href="/admin/deliveries" />
          <AttentionRow label="Open disputes" count={openDisputeCount} href="/admin/disputes" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Recent Activity</h2>
          <Link href="/admin/activity" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" description="Data will appear here as Fashion360 activity grows." />
        ) : (
          <div className="space-y-2">
            {recentActivity.map((log) => (
              <Card key={log.id} className="border-none shadow-sm">
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{log.action.replace(/_/g, " ")}</Badge>
                    {log.user && <p className="text-sm text-foreground">{log.user.name ?? log.user.email}</p>}
                    {log.business && <p className="text-xs text-muted-foreground">on {log.business.name}</p>}
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
