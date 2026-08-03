import { Users, UserPlus, Repeat, Star, UserX } from "lucide-react";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { prisma } from "@/lib/prisma";

export async function CustomerStats({ businessId }: { businessId: string }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, newThisMonth, returning, vip, inactive] = await Promise.all([
    prisma.customer.count({ where: { businessId, isArchived: false } }),
    prisma.customer.count({ where: { businessId, isArchived: false, createdAt: { gte: monthStart } } }),
    prisma.customer.count({
      where: { businessId, isArchived: false, tags: { some: { name: "Returning Customer" } } },
    }),
    prisma.customer.count({ where: { businessId, isArchived: false, isVip: true } }),
    prisma.customer.count({ where: { businessId, isArchived: false, status: "INACTIVE" } }),
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Total Customers" value={String(total)} icon={Users} />
      <StatCard label="New This Month" value={String(newThisMonth)} icon={UserPlus} />
      <StatCard label="Returning Customers" value={String(returning)} icon={Repeat} />
      <StatCard label="VIP Customers" value={String(vip)} icon={Star} />
      <StatCard label="Inactive Customers" value={String(inactive)} icon={UserX} />
    </div>
  );
}
