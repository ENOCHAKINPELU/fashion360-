import { Receipt, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/features/dashboard/components/stat-card";

export async function InvoiceDashboardStats({ businessId }: { businessId: string }) {
  const [total, paid, partiallyPaid, unpaid] = await Promise.all([
    prisma.invoice.count({ where: { businessId } }),
    prisma.invoice.count({ where: { businessId, status: "PAID" } }),
    prisma.invoice.count({ where: { businessId, status: "PARTIALLY_PAID" } }),
    prisma.invoice.count({ where: { businessId, status: { in: ["SENT", "VIEWED", "OVERDUE"] } } }),
  ]);

  const stats = [
    { label: "Total Invoices", value: total, icon: Receipt },
    { label: "Paid", value: paid, icon: CheckCircle2 },
    { label: "Partially Paid", value: partiallyPaid, icon: Clock },
    { label: "Unpaid", value: unpaid, icon: AlertCircle },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={String(stat.value)} icon={stat.icon} />
      ))}
    </div>
  );
}
