import { Ruler, FilePlus2, RefreshCcw, UserX } from "lucide-react";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { prisma } from "@/lib/prisma";

export async function MeasurementsDashboardStats({ businessId }: { businessId: string }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, newThisMonth, updatedThisMonth, totalCustomers, customersWithMeasurements] = await Promise.all([
    prisma.measurement.count({ where: { businessId } }),
    prisma.measurement.count({ where: { businessId, createdAt: { gte: monthStart } } }),
    prisma.measurementHistory.count({ where: { businessId, action: "UPDATED", createdAt: { gte: monthStart } } }),
    prisma.customer.count({ where: { businessId, isArchived: false } }),
    prisma.measurement.findMany({ where: { businessId }, distinct: ["customerId"], select: { customerId: true } }),
  ]);

  const withoutMeasurements = Math.max(0, totalCustomers - customersWithMeasurements.length);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Measurements" value={String(total)} icon={Ruler} />
      <StatCard label="New This Month" value={String(newThisMonth)} icon={FilePlus2} />
      <StatCard label="Updated This Month" value={String(updatedThisMonth)} icon={RefreshCcw} />
      <StatCard label="Customers Without Measurements" value={String(withoutMeasurements)} icon={UserX} />
    </div>
  );
}
