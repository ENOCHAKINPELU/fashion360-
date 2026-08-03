"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, CreditCard, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/shared/components/logo";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface InvoicePayBundle {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    currency: string;
    dueDate: string | null;
    total: number;
    amountPaid: number;
    balanceDue: number;
    paymentInstructions: string | null;
    business: { name: string; logoUrl: string | null };
    customer: { firstName: string; lastName: string };
    order: { orderCode: string };
  };
  items: { id: string; name: string; quantity: number; unitPrice: number; subtotal: number }[];
  paymentSchedule: {
    milestones: { id: string; label: string; amount: number; status: string; dueDate: string | null }[];
  } | null;
  payments: { id: string; amount: number; method: string; paidAt: string | null; receipt: { id: string } | null }[];
  canPayOnline: boolean;
}

const STATUS_META: Record<string, { label: string; tone: "neutral" | "warning" | "success" | "danger" }> = {
  DRAFT: { label: "Preparing Invoice", tone: "neutral" },
  SENT: { label: "Payment Due", tone: "warning" },
  VIEWED: { label: "Payment Due", tone: "warning" },
  PARTIALLY_PAID: { label: "Partially Paid", tone: "warning" },
  PAID: { label: "Paid in Full", tone: "success" },
  OVERDUE: { label: "Overdue", tone: "danger" },
  VOID: { label: "Void", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  REFUNDED: { label: "Refunded", tone: "neutral" },
  PARTIALLY_REFUNDED: { label: "Partially Refunded", tone: "neutral" },
};

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

export function InvoicePayClient({ token }: { token: string }) {
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [bundle, setBundle] = useState<InvoicePayBundle | null>(null);
  const [paying, setPaying] = useState(false);
  const hasLoadedRef = useRef(false);

  async function load() {
    try {
      const res = await fetch(`/api/invoice-share/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "This link is no longer valid.");
        setLoadState("error");
        return;
      }
      setBundle(data);
      setLoadState("ready");
    } catch {
      setErrorMessage("Something went wrong loading this invoice. Please check your connection and try again.");
      setLoadState("error");
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handlePayNow() {
    setPaying(true);
    try {
      const res = await fetch(`/api/invoice-share/${token}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start payment");
      window.location.href = data.authorizationUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start payment");
      setPaying(false);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="space-y-4">
          <Skeleton className="mx-auto h-8 w-72" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (loadState === "error" || !bundle) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-14 text-center">
        <div className="mb-6">
          <Logo />
        </div>
        <div className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-foreground">This link is no longer valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  const { invoice } = bundle;
  const meta = STATUS_META[invoice.status] ?? { label: invoice.status, tone: "neutral" as const };
  const isFullyPaid = invoice.balanceDue <= 0.01;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className="flex items-center gap-3">
          {invoice.business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={invoice.business.logoUrl} alt={invoice.business.name} className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-border" />
          ) : (
            <Logo mark />
          )}
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Invoice Payment</p>
            <p className="font-semibold text-foreground">{invoice.business.name}</p>
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold", TONE_CLASSES[meta.tone])}>
          {meta.label}
        </span>
      </header>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          Invoice for {invoice.customer.firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {invoice.invoiceNumber} · Order {invoice.order.orderCode}
          {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
        </p>
      </div>

      {isFullyPaid && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-success/20 bg-success-soft p-4">
          <CheckCircle2 className="size-5 shrink-0 text-success" />
          <p className="text-sm font-medium text-success">This invoice has been paid in full. Thank you!</p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bundle.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-foreground">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-muted-foreground">{formatCurrency(item.subtotal, invoice.currency)}</span>
              </div>
            ))}

            {invoice.paymentInstructions && (
              <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{invoice.paymentInstructions}</p>
            )}

            {bundle.payments.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-3">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Payment History</p>
                {bundle.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {payment.paidAt ? formatDate(payment.paidAt) : "N/A"} · {payment.method}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{formatCurrency(payment.amount, invoice.currency)}</span>
                      {payment.receipt && (
                        <a href={`/api/invoice-share/${token}/receipts/${payment.receipt.id}/pdf`} target="_blank" rel="noreferrer">
                          <Download className="size-3.5 text-primary" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Amount Due</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-foreground">{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-success">{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                <span className="text-foreground">Balance Due</span>
                <span className="text-foreground">{formatCurrency(invoice.balanceDue, invoice.currency)}</span>
              </div>
            </CardContent>
          </Card>

          {!isFullyPaid && (
            <Card>
              <CardHeader>
                <CardTitle>Pay Now</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bundle.canPayOnline ? (
                  <Button className="w-full gap-1.5" onClick={handlePayNow} disabled={paying}>
                    <CreditCard className="size-4" /> {paying ? "Redirecting..." : `Pay ${formatCurrency(invoice.balanceDue, invoice.currency)}`}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Online payment isn't set up yet. Please contact {invoice.business.name} to arrange payment.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  You'll be securely redirected to {invoice.business.name}'s payment provider. Fashion360 never holds
                  your payment.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
