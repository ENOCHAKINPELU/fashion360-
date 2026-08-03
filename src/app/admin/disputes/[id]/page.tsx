import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { DisputeResolveForm } from "@/features/admin/components/dispute-resolve-form";

export default async function AdminDisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      business: { select: { id: true, name: true } },
      order: { select: { id: true, orderCode: true, totalValue: true, amountPaid: true } },
      customer: { select: { firstName: true, lastName: true, email: true } },
      evidence: { orderBy: { createdAt: "asc" } },
      responses: { orderBy: { createdAt: "asc" } },
      resolution: { include: { refund: true } },
    },
  });
  if (!dispute) notFound();

  const payment = await prisma.payment.findFirst({
    where: { orderId: dispute.orderId, status: "SUCCESSFUL" },
    orderBy: { paidAt: "desc" },
  });
  const alreadyRefunded = await prisma.refund.aggregate({
    where: { paymentId: payment?.id, status: "SUCCESSFUL" },
    _sum: { amount: true },
  });
  const maxRefundable = payment ? Math.max(0, payment.amount - (alreadyRefunded._sum.amount ?? 0)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dispute.order.orderCode}</h1>
          <Badge variant="outline">{dispute.status.replace(/_/g, " ")}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {dispute.business.name} · {dispute.customer.firstName} {dispute.customer.lastName} ({dispute.customer.email}) · {dispute.issueType.replace(/_/g, " ")}
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-2">
          <p className="text-sm font-medium text-foreground">Customer&apos;s Report</p>
          <p className="text-sm text-muted-foreground">{dispute.description}</p>
          <p className="text-xs text-muted-foreground">Reported {formatDate(dispute.createdAt)}</p>
        </CardContent>
      </Card>

      {dispute.evidence.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-3">
            <p className="text-sm font-medium text-foreground">Evidence</p>
            {dispute.evidence.map((e) => (
              <div key={e.id} className="text-sm text-muted-foreground">
                <p>{e.submittedByType}: {e.description}</p>
                {e.photos.length > 0 && <p className="text-xs">{e.photos.length} photo(s) attached</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {dispute.responses.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-3">
            <p className="text-sm font-medium text-foreground">Responses</p>
            {dispute.responses.map((r) => (
              <div key={r.id} className="text-sm">
                <p className="text-xs text-muted-foreground">{r.authorType} · {formatDate(r.createdAt)}</p>
                <p className="text-foreground">{r.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm">
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p className="text-muted-foreground">Order Total: <span className="text-foreground">{dispute.order.totalValue}</span></p>
          <p className="text-muted-foreground">Amount Paid: <span className="text-foreground">{dispute.order.amountPaid}</span></p>
          <p className="text-muted-foreground">Available to Refund: <span className="text-foreground">{maxRefundable}</span></p>
        </CardContent>
      </Card>

      {dispute.resolution ? (
        <Card className="border-none shadow-sm border-success/20 bg-success-soft">
          <CardContent className="space-y-1">
            <p className="text-sm font-medium text-success">Resolved: {dispute.resolution.resolutionType.replace(/_/g, " ")}</p>
            <p className="text-sm text-success">{dispute.resolution.notes}</p>
          </CardContent>
        </Card>
      ) : (
        <DisputeResolveForm disputeId={dispute.id} paymentId={payment?.id ?? null} maxRefundable={maxRefundable} />
      )}
    </div>
  );
}
