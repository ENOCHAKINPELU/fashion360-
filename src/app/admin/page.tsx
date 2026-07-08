import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { Building2, Users, ShoppingBag, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const [businessCount, userCount, orderCount, paidPayments] = await Promise.all([
    prisma.business.count(),
    prisma.user.count(),
    prisma.order.count(),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Platform Overview</h1>
        <p className="text-sm text-muted">Fashion360 across every business on the platform.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Businesses" value={String(businessCount)} icon={Building2} />
        <StatCard label="Users" value={String(userCount)} icon={Users} />
        <StatCard label="Orders" value={String(orderCount)} icon={ShoppingBag} />
        <StatCard
          label="Total Processed Payments"
          value={formatCurrency(Number(paidPayments._sum.amount ?? 0))}
          icon={TrendingUp}
        />
      </div>
    </div>
  );
}
