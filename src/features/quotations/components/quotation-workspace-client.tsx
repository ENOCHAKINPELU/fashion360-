"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Send, Gavel, FileCheck2, PlusCircle, Share2, ArrowRightLeft, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { LineItemsEditor } from "@/features/quotations/components/line-items-editor";
import { PricingTermsFields } from "@/features/quotations/components/pricing-terms-fields";
import { FinancialShareDialog } from "@/features/quotations/components/financial-share-dialog";
import { QuotationStatusBadge } from "@/features/quotations/components/quotation-status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { QuotationDetailData } from "@/features/quotations/types";
import type { FinancialLineItemInput } from "@/lib/validations/quotation";

export function QuotationWorkspaceClient({ quotation, currency }: { quotation: QuotationDetailData; currency: string }) {
  const router = useRouter();
  const versions = quotation.versions;
  const latestVersion = versions[0] ?? null;

  const [shareOpen, setShareOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [converting, setConverting] = useState(false);

  const fullCustomerName = `${quotation.customer.firstName} ${quotation.customer.lastName}`;
  const canConvert = quotation.status === "ACCEPTED" && !quotation.invoice;

  async function requestApproval() {
    try {
      const res = await fetch(`/api/quotations/${quotation.id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send for review");
      toast.success("Sent for customer review");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send for review");
    }
  }

  async function convertToInvoice() {
    setConverting(true);
    try {
      const res = await fetch(`/api/quotations/${quotation.id}/convert-to-invoice`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not convert to invoice");
      toast.success(`Invoice ${data.invoice.invoiceNumber} created`);
      router.push(`/dashboard/invoices/${data.invoice.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not convert to invoice");
      setConverting(false);
    }
  }

  const pillClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="space-y-6">
      <Link href="/dashboard/quotations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Back to Quotations
      </Link>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{quotation.quotationNumber}</h1>
                <QuotationStatusBadge status={quotation.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {quotation.order ? (
                  <>
                    <Link href={`/dashboard/orders/${quotation.order.id}`} className="text-muted-foreground hover:text-foreground">
                      Order {quotation.order.orderCode}
                    </Link>
                    <span className="text-muted-foreground">·</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">Not yet an order, pending acceptance</span>
                    <span className="text-muted-foreground">·</span>
                  </>
                )}
                <Link href={`/dashboard/customers/${quotation.customer.id}`} className="text-muted-foreground hover:text-foreground">
                  {fullCustomerName} ({quotation.customer.customerCode})
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            <button className={pillClass} onClick={() => setShareOpen(true)}>
              <Share2 className="size-3.5" /> Send to Customer
            </button>
            <button className={pillClass} onClick={() => setSendConfirmOpen(true)} disabled={quotation.status === "ACCEPTED"}>
              <Send className="size-3.5" /> Mark Sent
            </button>
            <button className={pillClass} onClick={() => setDecisionOpen(true)} disabled={quotation.status === "ACCEPTED"}>
              <Gavel className="size-3.5" /> Record Decision
            </button>
            <button className={pillClass} onClick={() => setNewVersionOpen(true)} disabled={quotation.status === "ACCEPTED"}>
              <PlusCircle className="size-3.5" /> Create New Version
            </button>
            {canConvert && (
              <button className={pillClass} onClick={convertToInvoice} disabled={converting}>
                <ArrowRightLeft className="size-3.5" /> {converting ? "Converting..." : "Convert to Invoice"}
              </button>
            )}
            {quotation.invoice && (
              <Link href={`/dashboard/invoices/${quotation.invoice.id}`} className={pillClass}>
                <FileCheck2 className="size-3.5" /> View Invoice {quotation.invoice.invoiceNumber}
              </Link>
            )}
            <a href={`/api/quotations/${quotation.id}/pdf`} target="_blank" rel="noreferrer" className={pillClass}>
              <Download className="size-3.5" /> Download PDF
            </a>
          </div>
        </CardContent>
      </Card>

      {latestVersion && (
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Version {latestVersion.versionNumber} Summary
              </p>
              <p className="text-xs text-muted-foreground">Created {formatDate(latestVersion.createdAt)}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                {latestVersion.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="text-muted-foreground">{formatCurrency(item.subtotal, currency)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{formatCurrency(latestVersion.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-foreground">-{formatCurrency(latestVersion.discount, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground">{formatCurrency(latestVersion.tax, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="text-foreground">{formatCurrency(latestVersion.deliveryFee, currency)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">{formatCurrency(latestVersion.total, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit Required ({latestVersion.depositPercentage}%)</span>
                  <span className="text-foreground">{formatCurrency(latestVersion.depositRequired, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining Balance</span>
                  <span className="text-foreground">{formatCurrency(latestVersion.balanceDue, currency)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm">
        <CardContent>
          <Tabs defaultValue="versions">
            <TabsList>
              <TabsTrigger value="versions">Version History</TabsTrigger>
              <TabsTrigger value="terms">Terms</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="revisions">Revision Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="versions" className="space-y-3 pt-4">
              {versions.map((version) => (
                <div key={version.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Version {version.versionNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {version.createdBy?.name ?? "System"} · {formatDate(version.createdAt)}
                    </p>
                    {version.changesSummary && <p className="mt-1 text-xs text-muted-foreground">{version.changesSummary}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{formatCurrency(version.total, currency)}</p>
                    <p className="text-xs text-muted-foreground">{version.status}</p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="terms" className="space-y-2 pt-4 text-sm">
              {latestVersion?.paymentTerms && <p><span className="text-muted-foreground">Payment Terms: </span>{latestVersion.paymentTerms}</p>}
              {latestVersion?.cancellationPolicy && <p><span className="text-muted-foreground">Cancellation Policy: </span>{latestVersion.cancellationPolicy}</p>}
              {latestVersion?.refundPolicy && <p><span className="text-muted-foreground">Refund Policy: </span>{latestVersion.refundPolicy}</p>}
              {latestVersion?.alterationPolicy && <p><span className="text-muted-foreground">Alteration Policy: </span>{latestVersion.alterationPolicy}</p>}
              {latestVersion?.deliveryPolicy && <p><span className="text-muted-foreground">Delivery Policy: </span>{latestVersion.deliveryPolicy}</p>}
              {latestVersion?.customTerms && <p><span className="text-muted-foreground">Custom Terms: </span>{latestVersion.customTerms}</p>}
              {quotation.expiresAt && <p><span className="text-muted-foreground">Expires: </span>{formatDate(quotation.expiresAt)}</p>}
              {!latestVersion?.paymentTerms &&
                !latestVersion?.cancellationPolicy &&
                !latestVersion?.refundPolicy && <p className="text-muted-foreground">No terms configured for this version.</p>}
            </TabsContent>

            <TabsContent value="comments" className="space-y-3 pt-4">
              {quotation.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
              {quotation.comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {comment.authorType === "CUSTOMER" ? "Customer" : comment.author?.name ?? "Staff"} · {formatDate(comment.createdAt)}
                  </p>
                  <p className="text-foreground">{comment.body}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="revisions" className="space-y-3 pt-4">
              {quotation.revisionRequests.length === 0 && <p className="text-sm text-muted-foreground">No revision requests yet.</p>}
              {quotation.revisionRequests.map((req) => (
                <div key={req.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {formatDate(req.createdAt)} · {req.status}
                  </p>
                  <p className="text-foreground">{req.body}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <FinancialShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        apiBase={`/api/quotations/${quotation.id}`}
        reviewPath="/quotation-review"
        shares={quotation.shares}
        title="Share Quotation"
        description="Generate a secure, expiring link the customer can use to review, accept, or decline this quotation, no login required."
      />

      <ConfirmDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        title="Send latest version for customer review?"
        description="The current draft version will become active and the customer will be notified to review it."
        confirmLabel="Send for Review"
        onConfirm={requestApproval}
      />

      <NewVersionDialog
        open={newVersionOpen}
        onOpenChange={setNewVersionOpen}
        quotationId={quotation.id}
        currency={currency}
        baseItems={latestVersion?.items.map((i) => ({
          type: i.type as FinancialLineItemInput["type"],
          name: i.name,
          description: i.description ?? "",
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          tax: i.tax,
        })) ?? []}
        baseVersion={latestVersion}
      />

      <DecisionDialog
        open={decisionOpen}
        onOpenChange={setDecisionOpen}
        quotationId={quotation.id}
        versionId={latestVersion?.id ?? ""}
        versionNumber={latestVersion?.versionNumber ?? 0}
      />
    </div>
  );
}

function NewVersionDialog({
  open,
  onOpenChange,
  quotationId,
  currency,
  baseItems,
  baseVersion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  currency: string;
  baseItems: FinancialLineItemInput[];
  baseVersion: QuotationDetailData["versions"][number] | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<FinancialLineItemInput[]>(baseItems.length ? baseItems : []);
  const [changesSummary, setChangesSummary] = useState("");
  const [pricing, setPricing] = useState({
    discount: baseVersion?.discount ?? 0,
    tax: baseVersion?.tax ?? 0,
    deliveryFee: baseVersion?.deliveryFee ?? 0,
    additionalCharges: baseVersion?.additionalCharges ?? 0,
    paymentTerms: baseVersion?.paymentTerms ?? "",
    cancellationPolicy: baseVersion?.cancellationPolicy ?? "",
    refundPolicy: baseVersion?.refundPolicy ?? "",
    alterationPolicy: baseVersion?.alterationPolicy ?? "",
    deliveryPolicy: baseVersion?.deliveryPolicy ?? "",
    customTerms: baseVersion?.customTerms ?? "",
  });
  const [depositPercentage, setDepositPercentage] = useState(baseVersion?.depositPercentage ?? 50);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, changesSummary, ...pricing, depositPercentage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create new version");
      toast.success(`Version ${data.version.versionNumber} created`);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create new version");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Version</DialogTitle>
          <DialogDescription>Typically used after a customer requests changes. The new version starts as a draft.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea rows={2} value={changesSummary} onChange={(e) => setChangesSummary(e.target.value)} placeholder="What changed in this version?" />
          <LineItemsEditor items={items} onChange={setItems} currency={currency} />
          <PricingTermsFields
            value={pricing}
            onChange={(patch) => setPricing((prev) => ({ ...prev, ...patch }))}
            showDeposit
            depositPercentage={depositPercentage}
            onDepositPercentageChange={setDepositPercentage}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || items.length === 0}>
            {submitting ? "Creating..." : "Create Version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecisionDialog({
  open,
  onOpenChange,
  quotationId,
  versionId,
  versionNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  versionId: string;
  versionNumber: number;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<"ACCEPTED" | "DECLINED">("ACCEPTED");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!versionId || !confirmed) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, confirm: true, versionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not record decision");
      toast.success(decision === "ACCEPTED" ? "Quotation accepted" : "Quotation declined");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record decision");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Approval Decision</DialogTitle>
          <DialogDescription>Record a decision taken outside the customer portal for version {versionNumber}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={decision === "ACCEPTED" ? "default" : "outline"} onClick={() => setDecision("ACCEPTED")}>
              Accept
            </Button>
            <Button type="button" size="sm" variant={decision === "DECLINED" ? "destructive" : "outline"} onClick={() => setDecision("DECLINED")}>
              Decline
            </Button>
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3 text-sm">
            <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>
              {decision === "ACCEPTED"
                ? "You are accepting this quotation on the customer's behalf. This will lock the version."
                : "You are declining this quotation. The team will be notified to revise it."}
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant={decision === "DECLINED" ? "destructive" : "default"} onClick={submit} disabled={submitting || !confirmed}>
            {submitting ? "Recording..." : "Record Decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
