"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QuotationStatusBadge } from "@/features/quotations/components/quotation-status-badge";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import { OrderPaymentStatusBadge } from "@/features/orders/components/order-payment-status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface QuotationSummary {
  id: string;
  quotationNumber: string;
  status: string;
  createdAt: string;
}

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  payments: { id: string; amount: number; currency: string; method: string; status: string; paidAt: string | null }[];
}

// Self-contained: fetches its own data via the same list endpoints the
// Quotations/Invoices pages use, rather than threading Phase 8 fields
// through OrderDetailData/ORDER_DETAIL_INCLUDE — keeps the Phase 6 order
// detail query and types untouched (implementation rule: don't break
// Phases 1-7).
interface PayoutSummary {
  netAmount: number;
  platformFee: number;
  deliveryFee: number;
  refundedAmount: number;
  status: string;
  eligibleAt: string;
  paidAt: string | null;
}

export function OrderFinancialsTab({
  orderId,
  totalValue,
  amountPaid,
  balanceDue,
  paymentStatus,
  payout,
}: {
  orderId: string;
  totalValue: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
  payout?: PayoutSummary | null;
}) {
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<QuotationSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/quotations?orderId=${orderId}&pageSize=10`).then((r) => r.json()),
      fetch(`/api/invoices?orderId=${orderId}&pageSize=10`).then((r) => r.json()),
    ])
      .then(([q, i]) => {
        setQuotations(q.quotations ?? []);
        setInvoices(i.invoices ?? []);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  const currency = invoices[0]?.currency ?? "NGN";
  const payments = invoices.flatMap((inv) => inv.payments);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="space-y-1.5 text-sm">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Order Financial Summary</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Order Value</span>
            <span className="text-foreground">{formatCurrency(totalValue, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="text-success">{formatCurrency(amountPaid, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Balance</span>
            <span className="text-foreground">{formatCurrency(balanceDue, currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payment Status</span>
            <OrderPaymentStatusBadge status={paymentStatus} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Quotations</p>
          {quotations.length === 0 && <p className="text-sm text-muted-foreground">No quotations for this order yet.</p>}
          {quotations.map((q) => (
            <Link key={q.id} href={`/dashboard/quotations/${q.id}`} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm hover:border-primary/40">
              <span className="font-medium text-foreground">{q.quotationNumber}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{formatDate(q.createdAt)}</span>
                <QuotationStatusBadge status={q.status} />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Invoices</p>
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices for this order yet.</p>}
          {invoices.map((inv) => (
            <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm hover:border-primary/40">
              <span className="font-medium text-foreground">{inv.invoiceNumber}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{formatCurrency(inv.total, inv.currency)}</span>
                <InvoiceStatusBadge status={inv.status} />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {payout && (
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-1.5 text-sm">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Payout</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Total</span>
              <span className="text-foreground">{formatCurrency(totalValue, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee</span>
              <span className="text-foreground">-{formatCurrency(payout.platformFee, currency)}</span>
            </div>
            {payout.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="text-foreground">-{formatCurrency(payout.deliveryFee, currency)}</span>
              </div>
            )}
            {payout.refundedAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refunded</span>
                <span className="text-foreground">-{formatCurrency(payout.refundedAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
              <span className="text-foreground">Net Payout</span>
              <span className="text-foreground">{formatCurrency(payout.netAmount, currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-foreground">{payout.status}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Payment History</p>
          {payments.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded yet.</p>}
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {p.paidAt ? formatDate(p.paidAt) : "N/A"} · {p.method}
              </span>
              <span className="text-foreground">{formatCurrency(p.amount, p.currency)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
