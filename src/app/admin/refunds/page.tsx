import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { RefreshCcw } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning-soft text-warning",
  SUCCESSFUL: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
};

export default async function AdminRefundsPage() {
  const refunds = await prisma.refund.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      business: { select: { name: true } },
      payment: { select: { currency: true, invoice: { select: { invoiceNumber: true } } } },
      processedBy: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Refunds</h1>
        <p className="text-sm text-muted-foreground">Every refund is processed through Flutterwave (or manually, for legacy offline payments) and verified server-side before being marked successful.</p>
      </div>

      {refunds.length === 0 ? (
        <EmptyState icon={RefreshCcw} title="No refunds yet" description="Refunds will appear here once processed." />
      ) : (
        <div className="space-y-2">
          {refunds.map((r) => (
            <Card key={r.id} className="border-none shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{r.amount} {r.payment.currency}</p>
                    <Badge className={STATUS_STYLES[r.status]}>{r.status}</Badge>
                    <Badge variant="outline">{r.type}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.business.name} · {r.payment.invoice?.invoiceNumber} · {r.reason}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{r.processedBy?.name ?? "System"}</p>
                  <p>{formatDate(r.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
