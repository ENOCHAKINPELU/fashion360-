"use client";

import { useState } from "react";
import { Download, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RecordPaymentDialog } from "@/components/dashboard/record-payment-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  amount: string;
  amountPaid: string;
  dueDate: string | null;
  createdAt: string;
  customer: { name: string };
};

const STATUS_TONE: Record<string, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  SENT: "accent",
  PAID: "success",
  OVERDUE: "danger",
  VOID: "warning",
};

export function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const [target, setTarget] = useState<Invoice | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Invoices</h1>
        <p className="text-sm text-muted">Generated automatically when a quotation is accepted.</p>
      </div>

      {invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet" description="Accept a quotation to generate one." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-6 py-3 font-medium">Invoice</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Paid / Total</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => {
                const balance = Number(inv.amount) - Number(inv.amountPaid);
                return (
                  <tr key={inv.id}>
                    <td className="px-6 py-3">
                      <p className="font-medium text-foreground">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted">{formatDate(inv.createdAt)}</p>
                    </td>
                    <td className="px-6 py-3 text-muted">{inv.customer.name}</td>
                    <td className="px-6 py-3 text-muted">
                      {formatCurrency(inv.amountPaid)} / {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-accent"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {balance > 0 && (
                          <Button size="sm" onClick={() => setTarget(inv)}>
                            Record payment
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {target && (
        <RecordPaymentDialog
          open={!!target}
          onClose={() => setTarget(null)}
          invoiceId={target.id}
          balance={Number(target.amount) - Number(target.amountPaid)}
        />
      )}
    </div>
  );
}
