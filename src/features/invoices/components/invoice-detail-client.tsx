"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Send, PlusCircle, Link2, Share2, Download, Ban, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { FinancialShareDialog } from "@/features/quotations/components/financial-share-dialog";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import { RecordPaymentDialog } from "@/features/invoices/components/record-payment-dialog";
import { PaymentLinkDialog } from "@/features/invoices/components/payment-link-dialog";
import { RefundDialog } from "@/features/invoices/components/refund-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceDetailData } from "@/features/invoices/types";

export function InvoiceDetailClient({ invoice }: { invoice: InvoiceDetailData }) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentLinkOpen, setPaymentLinkOpen] = useState(false);
  const [refundPaymentId, setRefundPaymentId] = useState<string | null>(null);

  const fullCustomerName = `${invoice.customer.firstName} ${invoice.customer.lastName}`;
  const canModify = invoice.status !== "VOID" && invoice.status !== "CANCELLED" && invoice.balanceDue > 0;

  async function duplicateInvoice() {
    const res = await fetch(`/api/invoices/${invoice.id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not duplicate invoice");
      return;
    }
    toast.success(`Duplicated as ${data.invoice.invoiceNumber}`);
    router.push(`/dashboard/invoices/${data.invoice.id}`);
  }

  async function sendInvoice() {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send invoice");
      toast.success("Invoice sent to customer");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send invoice");
    }
  }

  async function voidInvoice() {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not void invoice");
      toast.success("Invoice voided");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not void invoice");
    }
  }

  const pillClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="space-y-6">
      <Link href="/dashboard/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Back to Invoices
      </Link>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{invoice.invoiceNumber}</h1>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/dashboard/orders/${invoice.order.id}`} className="text-muted-foreground hover:text-foreground">
                  Order {invoice.order.orderCode}
                </Link>
                <span className="text-muted-foreground">·</span>
                <Link href={`/dashboard/customers/${invoice.customer.id}`} className="text-muted-foreground hover:text-foreground">
                  {fullCustomerName} ({invoice.customer.customerCode})
                </Link>
                {invoice.quotation && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <Link href={`/dashboard/quotations/${invoice.quotation.id}`} className="text-muted-foreground hover:text-foreground">
                      From {invoice.quotation.quotationNumber}
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1 text-right text-sm">
              <p className="text-muted-foreground">
                Due date: <span className="text-foreground">{invoice.dueDate ? formatDate(invoice.dueDate) : "N/A"}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {invoice.status === "DRAFT" && (
              <button className={pillClass} onClick={() => setSendConfirmOpen(true)}>
                <Send className="size-3.5" /> Send Invoice
              </button>
            )}
            <button className={pillClass} onClick={() => setShareOpen(true)}>
              <Share2 className="size-3.5" /> Share with Customer
            </button>
            {canModify && (
              <button className={pillClass} onClick={() => setRecordPaymentOpen(true)}>
                <PlusCircle className="size-3.5" /> Record Offline Payment
              </button>
            )}
            {canModify && (
              <button className={pillClass} onClick={() => setPaymentLinkOpen(true)}>
                <Link2 className="size-3.5" /> Create Payment Link
              </button>
            )}
            <button className={pillClass} onClick={duplicateInvoice}>
              <Copy className="size-3.5" /> Duplicate
            </button>
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer" className={pillClass}>
              <Download className="size-3.5" /> Download PDF
            </a>
            {invoice.status !== "VOID" && invoice.status !== "CANCELLED" && (
              <button
                className={`${pillClass} hover:border-danger/40 hover:bg-danger-soft hover:text-danger`}
                onClick={() => setVoidConfirmOpen(true)}
              >
                <Ban className="size-3.5" /> Void Invoice
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardContent className="space-y-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Line Items</p>
              {invoice.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="text-muted-foreground">{formatCurrency(item.subtotal, invoice.currency)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent>
              <Tabs defaultValue="payments">
                <TabsList>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="schedule">Payment Schedule</TabsTrigger>
                  <TabsTrigger value="terms">Terms</TabsTrigger>
                </TabsList>

                <TabsContent value="payments" className="space-y-3 pt-4">
                  {invoice.payments.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded yet.</p>}
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="rounded-xl border border-border bg-surface p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{formatCurrency(payment.amount, payment.currency)}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.method} · {payment.provider} · {payment.status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
                            {payment.recordedBy?.name ? ` · recorded by ${payment.recordedBy.name}` : ""}
                          </p>
                          {payment.refunds.length > 0 && (
                            <p className="mt-1 text-xs text-warning">
                              Refunded: {formatCurrency(payment.refunds.reduce((s, r) => s + (r.status === "SUCCESSFUL" ? r.amount : 0), 0), payment.currency)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {payment.receipt && (
                            <a href={`/api/receipts/${payment.receipt.id}/pdf`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                              Receipt
                            </a>
                          )}
                          {payment.status === "SUCCESSFUL" && (
                            <Button variant="ghost" size="sm" onClick={() => setRefundPaymentId(payment.id)}>
                              Refund
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="schedule" className="space-y-3 pt-4">
                  {!invoice.paymentSchedule || invoice.paymentSchedule.milestones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payment schedule configured for this invoice.</p>
                  ) : (
                    invoice.paymentSchedule.milestones.map((milestone) => (
                      <div key={milestone.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm">
                        <div>
                          <p className="font-medium text-foreground">{milestone.label}</p>
                          <p className="text-xs text-muted-foreground">{milestone.dueDate ? `Due ${formatDate(milestone.dueDate)}` : "No due date"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-foreground">{formatCurrency(milestone.amount, invoice.currency)}</p>
                          <p className="text-xs text-muted-foreground">{milestone.status}</p>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="terms" className="space-y-2 pt-4 text-sm">
                  {invoice.paymentInstructions && <p><span className="text-muted-foreground">Payment Instructions: </span>{invoice.paymentInstructions}</p>}
                  {invoice.paymentTerms && <p><span className="text-muted-foreground">Payment Terms: </span>{invoice.paymentTerms}</p>}
                  {invoice.cancellationPolicy && <p><span className="text-muted-foreground">Cancellation Policy: </span>{invoice.cancellationPolicy}</p>}
                  {invoice.refundPolicy && <p><span className="text-muted-foreground">Refund Policy: </span>{invoice.refundPolicy}</p>}
                  {!invoice.paymentInstructions && !invoice.paymentTerms && !invoice.cancellationPolicy && (
                    <p className="text-muted-foreground">No terms configured.</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-none shadow-sm">
            <CardContent className="space-y-1.5 text-sm">
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Summary</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-foreground">-{formatCurrency(invoice.discount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">{formatCurrency(invoice.tax, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="text-foreground">{formatCurrency(invoice.deliveryFee, invoice.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-success">{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance Due</span>
                <span className="text-danger font-semibold">{formatCurrency(invoice.balanceDue, invoice.currency)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <FinancialShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        apiBase={`/api/invoices/${invoice.id}`}
        reviewPath="/invoice-pay"
        shares={invoice.shares}
        title="Share Invoice"
        description="Generate a secure, expiring link the customer can use to view this invoice and pay directly through your connected gateway."
      />

      <ConfirmDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        title="Send this invoice to the customer?"
        description="The customer will be notified that the invoice is ready."
        confirmLabel="Send Invoice"
        onConfirm={sendInvoice}
      />

      <ConfirmDialog
        open={voidConfirmOpen}
        onOpenChange={setVoidConfirmOpen}
        title="Void this invoice?"
        description="This invoice will no longer be payable. This action cannot be undone."
        confirmLabel="Void Invoice"
        destructive
        onConfirm={voidInvoice}
      />

      <RecordPaymentDialog
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        invoiceId={invoice.id}
        balanceDue={invoice.balanceDue}
        milestones={invoice.paymentSchedule?.milestones ?? []}
      />

      <PaymentLinkDialog open={paymentLinkOpen} onOpenChange={setPaymentLinkOpen} invoiceId={invoice.id} />

      {refundPaymentId && (
        <RefundDialog
          open={!!refundPaymentId}
          onOpenChange={(open) => !open && setRefundPaymentId(null)}
          paymentId={refundPaymentId}
          maxAmount={
            invoice.payments.find((p) => p.id === refundPaymentId)
              ? invoice.payments.find((p) => p.id === refundPaymentId)!.amount -
                invoice.payments
                  .find((p) => p.id === refundPaymentId)!
                  .refunds.reduce((s, r) => s + (r.status === "SUCCESSFUL" ? r.amount : 0), 0)
              : 0
          }
        />
      )}
    </div>
  );
}
