import { Image as ImageIcon, Clock, CheckCircle2, RotateCcw, XCircle, History, Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/features/dashboard/components/stat-card";

export async function DesignDashboardStats({ businessId }: { businessId: string }) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeStatuses = ["SENT_FOR_REVIEW", "UNDER_CUSTOMER_REVIEW", "REVISION_REQUESTED", "UPDATED"] as const;

  const [total, pendingApproval, approved, awaitingRevision, rejected, recentlyUpdated, activeReviews] =
    await Promise.all([
      prisma.designPreview.count({ where: { businessId } }),
      prisma.designPreview.count({
        where: { businessId, status: { in: ["SENT_FOR_REVIEW", "UNDER_CUSTOMER_REVIEW"] } },
      }),
      prisma.designPreview.count({ where: { businessId, status: { in: ["APPROVED", "LOCKED"] } } }),
      prisma.designPreview.count({ where: { businessId, status: "REVISION_REQUESTED" } }),
      prisma.designPreview.count({ where: { businessId, status: "REJECTED" } }),
      prisma.designPreview.count({ where: { businessId, updatedAt: { gte: sevenDaysAgo } } }),
      prisma.designPreview.count({ where: { businessId, status: { in: [...activeStatuses] } } }),
    ]);

  const stats = [
    { label: "Total Design Previews", value: total, icon: ImageIcon },
    { label: "Pending Customer Approval", value: pendingApproval, icon: Clock },
    { label: "Approved Designs", value: approved, icon: CheckCircle2 },
    { label: "Awaiting Revision", value: awaitingRevision, icon: RotateCcw },
    { label: "Rejected Designs", value: rejected, icon: XCircle },
    { label: "Recently Updated", value: recentlyUpdated, icon: History },
    { label: "Active Design Reviews", value: activeReviews, icon: Activity },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={String(stat.value)} icon={stat.icon} />
      ))}
    </div>
  );
}
