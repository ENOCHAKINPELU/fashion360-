"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { QuotationStatusBadge } from "@/features/quotations/components/quotation-status-badge";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText, Receipt, CreditCard, RotateCcw } from "lucide-react";

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
  payments: { id: string; amount: number; currency: string; method: string; paidAt: string | null; receipt?: { id: string } | null }[];
}

interface RefundSummary {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  payment: { invoice: { invoiceNumber: string }; currency: string };
}

// Section 28 of the Phase 8 spec — self-contained: fetches its own data via
// the same list endpoints the Quotations/Invoices/Payments pages use rather
// than threading Phase 8 fields through the customer profile's server
// query, so the existing customer profile page/types stay untouched.
export function CustomerFinancialPanel({ customerId, view }: { customerId: string; view: "quotations" | "invoices" | "payments" }) {
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<QuotationSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [refunds, setRefunds] = useState<RefundSummary[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/quotations?customerId=${customerId}&pageSize=20`).then((r) => r.json()),
      fetch(`/api/invoices?customerId=${customerId}&pageSize=20`).then((r) => r.json()),
      fetch(`/api/refunds?customerId=${customerId}`).then((r) => r.json()),
    ])
      .then(([q, i, r]) => {
        setQuotations(q.quotations ?? []);
        setInvoices(i.invoices ?? []);
        setRefunds(r.refunds ?? []);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <Skeleton className="h-48 w-full rounded-2xl" />;

  const currency = invoices[0]?.currency ?? "NGN";
  const totalSpent = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const outstandingBalance = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  const payments = invoices.flatMap((inv) => inv.payments);

  if (view === "quotations") {
    if (quotations.length === 0) return <EmptyState icon={FileText} title="No quotations yet" />;
    return (
      <div className="space-y-3">
        {quotations.map((q) => (
          <Link key={q.id} href={`/dashboard/quotations/${q.id}`} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm hover:border-primary/40">
            <span className="font-medium text-foreground">{q.quotationNumber}</span>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{formatDate(q.createdAt)}</span>
              <QuotationStatusBadge status={q.status} />
            </div>
          </Link>
        ))}
      </div>
    );
  }

  if (view === "invoices") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(totalSpent, currency)}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="space-y-1">
              <p className="text-xs text-muted-foreground">Outstanding Balance</p>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(outstandingBalance, currency)}</p>
            </CardContent>
          </Card>
        </div>
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" />
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm hover:border-primary/40">
                <span className="font-medium text-foreground">{inv.invoiceNumber}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{formatCurrency(inv.total, inv.currency)}</span>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Payment History</p>
        {payments.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payments yet" />
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm">
                <span className="text-muted-foreground">
                  {p.paidAt ? formatDate(p.paidAt) : "N/A"} · {p.method}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-foreground">{formatCurrency(p.amount, p.currency)}</span>
                  {p.receipt && (
                    <a href={`/api/receipts/${p.receipt.id}/pdf`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                      Receipt
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Refunds</p>
        {refunds.length === 0 ? (
          <EmptyState icon={RotateCcw} title="No refunds" />
        ) : (
          <div className="space-y-2">
            {refunds.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm">
                <span className="text-muted-foreground">
                  {formatDate(r.createdAt)} · {r.payment.invoice.invoiceNumber}
                </span>
                <span className="text-foreground">{formatCurrency(r.amount, r.payment.currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
