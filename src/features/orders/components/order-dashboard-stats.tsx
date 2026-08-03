import { ShoppingBag, PackagePlus, Activity, Factory, Shirt, CheckCircle2, Truck, AlertTriangle, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/features/dashboard/components/stat-card";

export async function OrderDashboardStats({ businessId }: { businessId: string }) {
  const now = new Date();
  const activeStatuses = [
    "PENDING_CONFIRMATION",
    "CONFIRMED",
    "AWAITING_PAYMENT",
    "READY_FOR_PRODUCTION",
    "IN_PRODUCTION",
    "FITTING",
    "ALTERATION",
    "FINAL_INSPECTION",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "ON_HOLD",
  ] as const;

  const [total, newOrders, active, inProduction, awaitingFitting, completed, readyForPickup, overdue, cancelled] =
    await Promise.all([
      prisma.order.count({ where: { businessId, isArchived: false } }),
      prisma.order.count({ where: { businessId, isArchived: false, status: { in: ["DRAFT", "PENDING_CONFIRMATION"] } } }),
      prisma.order.count({ where: { businessId, isArchived: false, status: { in: [...activeStatuses] } } }),
      prisma.order.count({ where: { businessId, isArchived: false, status: "IN_PRODUCTION" } }),
      prisma.order.count({ where: { businessId, isArchived: false, status: "FITTING" } }),
      prisma.order.count({ where: { businessId, isArchived: false, status: "COMPLETED" } }),
      prisma.order.count({ where: { businessId, isArchived: false, status: "READY_FOR_PICKUP" } }),
      prisma.order.count({
        where: {
          businessId,
          isArchived: false,
          expectedCompletionDate: { lt: now },
          status: { notIn: ["COMPLETED", "DELIVERED", "CANCELLED"] },
        },
      }),
      prisma.order.count({ where: { businessId, status: "CANCELLED" } }),
    ]);

  const stats = [
    { label: "Total Orders", value: total, icon: ShoppingBag },
    { label: "New Orders", value: newOrders, icon: PackagePlus },
    { label: "Active Orders", value: active, icon: Activity },
    { label: "In Production", value: inProduction, icon: Factory },
    { label: "Awaiting Fitting", value: awaitingFitting, icon: Shirt },
    { label: "Completed", value: completed, icon: CheckCircle2 },
    { label: "Ready for Pickup", value: readyForPickup, icon: Truck },
    { label: "Overdue", value: overdue, icon: AlertTriangle },
    { label: "Cancelled", value: cancelled, icon: XCircle },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={String(stat.value)} icon={stat.icon} />
      ))}
    </div>
  );
}
