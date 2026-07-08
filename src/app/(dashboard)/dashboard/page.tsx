import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STAGE_LABELS } from "@/lib/validations/order";
import {
  Users,
  ShoppingBag,
  CheckCircle2,
  CalendarClock,
  Wallet,
  TrendingUp,
  Plus,
  Bell,
} from "lucide-react";

const ACTIVE_STAGES = [
  "CONSULTATION",
  "MEASUREMENT",
  "DESIGN_APPROVAL",
  "PRODUCTION",
  "FITTING",
  "ALTERATION",
];

export default async function DashboardPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCustomers,
    activeOrders,
    completedOrders,
    upcomingAppointments,
    pendingInvoices,
    monthlyPayments,
    recentOrders,
    notifications,
  ] = await Promise.all([
    prisma.customer.count({ where: { businessId } }),
    prisma.order.count({ where: { businessId, stage: { in: ACTIVE_STAGES as never } } }),
    prisma.order.count({ where: { businessId, stage: "COMPLETED" } }),
    prisma.appointment.count({
      where: { businessId, startTime: { gte: now }, status: { in: ["SCHEDULED", "CONFIRMED"] } },
    }),
    prisma.invoice.aggregate({
      where: { businessId, status: { in: ["SENT", "OVERDUE"] } },
      _sum: { amount: true, amountPaid: true },
    }),
    prisma.payment.aggregate({
      where: { businessId, status: "PAID", paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.order.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { customer: { select: { name: true } } },
    }),
    prisma.notification.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const pendingAmount =
    Number(pendingInvoices._sum.amount ?? 0) - Number(pendingInvoices._sum.amountPaid ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Dashboard</h1>
          <p className="text-sm text-muted">Here&apos;s what&apos;s happening in your business today.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/customers?new=1">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" /> New customer
            </Button>
          </Link>
          <Link href="/dashboard/orders?new=1">
            <Button size="sm">
              <Plus className="h-4 w-4" /> New order
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total Customers" value={String(totalCustomers)} icon={Users} />
        <StatCard label="Active Orders" value={String(activeOrders)} icon={ShoppingBag} />
        <StatCard label="Completed Orders" value={String(completedOrders)} icon={CheckCircle2} />
        <StatCard label="Upcoming Appointments" value={String(upcomingAppointments)} icon={CalendarClock} />
        <StatCard label="Pending Payments" value={formatCurrency(pendingAmount)} icon={Wallet} />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(Number(monthlyPayments._sum.amount ?? 0))}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <Link href="/dashboard/orders" className="text-sm text-accent">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No orders yet"
                description="Orders you create for customers will show up here."
              />
            ) : (
              <div className="divide-y divide-border">
                {recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/dashboard/orders/${o.id}`}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{o.orderNumber}</p>
                      <p className="text-xs text-muted">{o.customer.name}</p>
                    </div>
                    <Badge tone="accent">{STAGE_LABELS[o.stage]}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted" />
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <EmptyState title="You're all caught up" />
            ) : (
              <div className="space-y-4">
                {notifications.map((n) => (
                  <div key={n.id}>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted">{formatDate(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
