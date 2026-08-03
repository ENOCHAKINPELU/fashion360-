import { FileText, CheckCircle2, Clock, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/features/dashboard/components/stat-card";

export async function QuotationDashboardStats({ businessId }: { businessId: string }) {
  const [total, accepted, pending, declined] = await Promise.all([
    prisma.quotation.count({ where: { businessId } }),
    prisma.quotation.count({ where: { businessId, status: { in: ["ACCEPTED", "CONVERTED"] } } }),
    prisma.quotation.count({ where: { businessId, status: { in: ["SENT", "VIEWED"] } } }),
    prisma.quotation.count({ where: { businessId, status: "DECLINED" } }),
  ]);

  const stats = [
    { label: "Total Quotations", value: total, icon: FileText },
    { label: "Accepted", value: accepted, icon: CheckCircle2 },
    { label: "Pending", value: pending, icon: Clock },
    { label: "Declined", value: declined, icon: XCircle },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={String(stat.value)} icon={stat.icon} />
      ))}
    </div>
  );
}
