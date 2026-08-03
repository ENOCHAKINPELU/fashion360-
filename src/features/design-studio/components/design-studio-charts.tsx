import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { designPreviewStatusOptions } from "@/lib/validations/design-preview";
import { DesignsByStatusChart } from "@/features/design-studio/components/charts/designs-by-status-chart";
import { DesignApprovalRateChart } from "@/features/design-studio/components/charts/design-approval-rate-chart";
import { AverageApprovalTimeChart } from "@/features/design-studio/components/charts/average-approval-time-chart";
import { RevisionRateChart } from "@/features/design-studio/components/charts/revision-rate-chart";

const STATUS_LABELS = Object.fromEntries(designPreviewStatusOptions.map((o) => [o.value, o.label]));
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function DesignStudioCharts({ businessId }: { businessId: string }) {
  const [byStatus, rejectedCount, revisionCounts] = await Promise.all([
    prisma.designPreview.groupBy({ by: ["status"], where: { businessId }, _count: true }),
    prisma.designPreview.count({ where: { businessId, status: "REJECTED" } }),
    prisma.designPreview.groupBy({
      by: ["revisionCount"],
      where: { businessId, status: { in: ["APPROVED", "LOCKED"] } },
      _count: true,
    }),
  ]);

  const approvedCount = byStatus
    .filter((r) => r.status === "APPROVED" || r.status === "LOCKED")
    .reduce((sum, r) => sum + r._count, 0);

  const statusData = byStatus
    .map((row) => ({ label: STATUS_LABELS[row.status] ?? row.status, value: row._count }))
    .sort((a, b) => b.value - a.value);

  const withoutRevisions = revisionCounts.filter((r) => r.revisionCount === 0).reduce((sum, r) => sum + r._count, 0);
  const withRevisions = revisionCounts.filter((r) => r.revisionCount > 0).reduce((sum, r) => sum + r._count, 0);

  const now = new Date();
  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const approvalTimeData = await Promise.all(
    monthBuckets.map(async ({ year, month }) => {
      const previews = await prisma.designPreview.findMany({
        where: {
          businessId,
          approvedAt: { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) },
          sentForReviewAt: { not: null },
        },
        select: { approvedAt: true, sentForReviewAt: true },
      });
      const days = previews.map(
        (p) => (p.approvedAt!.getTime() - p.sentForReviewAt!.getTime()) / (1000 * 60 * 60 * 24)
      );
      const avg = days.length > 0 ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : 0;
      return { label: MONTH_LABELS[month], days: avg };
    })
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Designs by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <DesignsByStatusChart data={statusData} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Design Approval Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <DesignApprovalRateChart approved={approvedCount} rejected={rejectedCount} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Average Approval Time</CardTitle>
        </CardHeader>
        <CardContent>
          <AverageApprovalTimeChart data={approvalTimeData} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Revision Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <RevisionRateChart withRevisions={withRevisions} withoutRevisions={withoutRevisions} />
        </CardContent>
      </Card>
    </div>
  );
}
