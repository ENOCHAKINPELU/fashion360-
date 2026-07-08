"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { QuotationFormDialog } from "@/components/dashboard/quotation-form-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";

type Quotation = {
  id: string;
  quoteNumber: string;
  status: string;
  description: string;
  price: string;
  deposit: string;
  balance: string;
  createdAt: string;
  customer: { name: string };
};

const STATUS_TONE: Record<string, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  SENT: "accent",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "warning",
};

export function QuotationsClient({
  quotations,
  customers,
}: {
  quotations: Quotation[];
  customers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    const res = await fetch(`/api/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Could not update quotation");
      return;
    }
    toast.success(status === "ACCEPTED" ? "Quotation accepted — invoice generated" : "Quotation updated");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Quotations</h1>
          <p className="text-sm text-muted">Send professional quotes and convert them to invoices.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New quotation
        </Button>
      </div>

      {quotations.length === 0 ? (
        <EmptyState icon={FileText} title="No quotations yet" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-6 py-3 font-medium">Quote</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Price</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td className="px-6 py-3">
                    <p className="font-medium text-foreground">{q.quoteNumber}</p>
                    <p className="text-xs text-muted">{formatDate(q.createdAt)}</p>
                  </td>
                  <td className="px-6 py-3 text-muted">{q.customer.name}</td>
                  <td className="px-6 py-3 text-muted">{formatCurrency(q.price)}</td>
                  <td className="px-6 py-3">
                    <Badge tone={STATUS_TONE[q.status]}>{q.status}</Badge>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/quotations/${q.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted hover:text-accent"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {q.status === "DRAFT" && (
                        <Button size="sm" variant="outline" disabled={busyId === q.id} onClick={() => updateStatus(q.id, "SENT")}>
                          Send
                        </Button>
                      )}
                      {q.status === "SENT" && (
                        <>
                          <Button size="sm" disabled={busyId === q.id} onClick={() => updateStatus(q.id, "ACCEPTED")}>
                            Accept
                          </Button>
                          <Button size="sm" variant="danger" disabled={busyId === q.id} onClick={() => updateStatus(q.id, "REJECTED")}>
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <QuotationFormDialog open={open} onClose={() => setOpen(false)} customers={customers} />
    </div>
  );
}
