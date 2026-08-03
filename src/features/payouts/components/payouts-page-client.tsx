"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PayoutRow {
  id: string;
  netAmount: number;
  platformFee: number;
  deliveryFee: number;
  refundedAmount: number;
  status: string;
  eligibleAt: string;
  paidAt: string | null;
  order: { id: string; orderCode: string; customer: { firstName: string; lastName: string } };
}

const STATUS_STYLES: Record<string, string> = {
  NOT_ELIGIBLE: "bg-muted text-muted-foreground",
  ELIGIBLE: "bg-info-soft text-info",
  PROCESSING: "bg-warning-soft text-warning",
  PAID: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
};

export function PayoutsPageClient({ payouts, currency }: { payouts: PayoutRow[]; currency: string }) {
  if (payouts.length === 0) {
    return <EmptyState icon={Wallet} title="No payouts yet" description="Payouts appear here once an order is fully completed and confirmed by the customer." />;
  }

  const totalEligible = payouts.filter((p) => p.status === "ELIGIBLE").reduce((sum, p) => sum + p.netAmount, 0);
  const totalPaid = payouts.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.netAmount, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="text-xs text-muted-foreground uppercase">Awaiting Payout</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{formatCurrency(totalEligible, currency)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="text-xs text-muted-foreground uppercase">Paid Out</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{formatCurrency(totalPaid, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {payouts.map((p) => (
          <Link key={p.id} href={`/dashboard/orders/${p.order.id}`}>
            <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {p.order.orderCode} · {p.order.customer.firstName} {p.order.customer.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Net {formatCurrency(p.netAmount, currency)} · {p.paidAt ? `Paid ${formatDate(p.paidAt)}` : `Eligible ${formatDate(p.eligibleAt)}`}
                  </p>
                </div>
                <Badge className={STATUS_STYLES[p.status] ?? STATUS_STYLES.NOT_ELIGIBLE}>{p.status}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
