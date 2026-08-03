"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Download, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/shared/components/logo";
import { Design3DViewer } from "@/features/design-studio/components/viewer/design-3d-viewer";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface QuotationBundle {
  quotation: {
    id: string;
    quotationNumber: string;
    status: string;
    expiresAt: string | null;
    orderId: string | null;
  };
  versions: {
    id: string;
    versionNumber: number;
    status: string;
    subtotal: number;
    discount: number;
    tax: number;
    deliveryFee: number;
    additionalCharges: number;
    total: number;
    depositRequired: number;
    balanceDue: number;
    productionDays: number | null;
    estimatedDeliveryDate: string | null;
    includedRevisions: number | null;
    additionalRevisionCost: number | null;
    paymentTerms: string | null;
    cancellationPolicy: string | null;
    refundPolicy: string | null;
    lateChangePolicy: string | null;
    items: { id: string; name: string; quantity: number; unitPrice: number; subtotal: number }[];
  }[];
  comments: { id: string; authorType: string; body: string; createdAt: string; author: { name: string | null } | null }[];
  business: { id: string; name: string; logoUrl: string | null; currency: string } | null;
  designPreview: {
    id: string;
    name: string;
    previewCode: string;
    versions: { id: string; versionNumber: number; previewImageUrl: string | null; model: { url: string; format: string } | null }[];
  } | null;
  measurementVersion: { values: Record<string, number>; versionNumber: number } | null;
}

const FINAL_STATUSES = new Set(["ACCEPTED", "DECLINED", "CONVERTED", "EXPIRED", "CANCELLED"]);

const STATUS_META: Record<string, { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  DRAFT: { label: "Preparing Quotation", tone: "neutral" },
  SENT: { label: "Awaiting Your Review", tone: "warning" },
  VIEWED: { label: "Awaiting Your Review", tone: "warning" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  CONVERTED: { label: "Accepted", tone: "success" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

export function CustomerQuotationClient({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [bundle, setBundle] = useState<QuotationBundle | null>(null);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [askBody, setAskBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasLoadedRef = useRef(false);
  const hasViewedRef = useRef(false);

  async function load() {
    try {
      const res = await fetch(`/api/customer/quotations/${quotationId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "Could not load this quotation.");
        setLoadState("error");
        return;
      }
      setBundle(data);
      setLoadState("ready");
      if (!hasViewedRef.current) {
        hasViewedRef.current = true;
        fetch(`/api/customer/quotations/${quotationId}/view`, { method: "POST" }).catch(() => {});
      }
    } catch {
      setErrorMessage("Something went wrong loading this quotation. Please check your connection and try again.");
      setLoadState("error");
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  async function handleAccept() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/quotations/${quotationId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not accept this quotation");
      toast.success("Quotation accepted, your order agreement is ready.");
      setAcceptOpen(false);
      if (data.order?.id) {
        router.push(`/account/orders/${data.order.id}`);
        return;
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not accept this quotation");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/quotations/${quotationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not decline this quotation");
      toast.success("Quotation declined. The business has been notified.");
      setDeclineOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not decline this quotation");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAsk() {
    if (!askBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/quotations/${quotationId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: askBody.trim(), versionId: bundle?.versions[0]?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send your question");
      toast.success("Sent to the business");
      setAskOpen(false);
      setAskBody("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your question");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="space-y-4">
          <Skeleton className="mx-auto h-8 w-72" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (loadState === "error" || !bundle) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-14 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-foreground">Couldn&apos;t load this quotation</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  const { quotation, business } = bundle;
  const currency = business?.currency ?? "NGN";
  const version = bundle.versions[0] ?? null;
  const isFinal = FINAL_STATUSES.has(quotation.status);
  const canDecide = quotation.status === "SENT" || quotation.status === "VIEWED";
  const meta = STATUS_META[quotation.status] ?? { label: quotation.status, tone: "neutral" as const };
  const approvedDesignVersion = bundle.designPreview?.versions[0] ?? null;
  const measurementEntries = bundle.measurementVersion ? Object.entries(bundle.measurementVersion.values) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className="flex items-center gap-3">
          {business?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoUrl} alt={business.name} className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-border" />
          ) : (
            <Logo mark />
          )}
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Quotation Review</p>
            <p className="font-semibold text-foreground">{business?.name}</p>
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold", TONE_CLASSES[meta.tone])}>
          {meta.label}
        </span>
      </header>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{bundle.designPreview?.name ?? quotation.quotationNumber}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {quotation.quotationNumber}
          {quotation.expiresAt && ` · Expires ${formatDate(quotation.expiresAt)}`}
        </p>
      </div>

      {quotation.orderId && (
        <div className="mb-6">
          <Button asChild className="w-full sm:w-auto">
            <a href={`/account/orders/${quotation.orderId}`}>View Order</a>
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {approvedDesignVersion && (
            <Card>
              <CardHeader>
                <CardTitle>Approved Design</CardTitle>
              </CardHeader>
              <CardContent>
                <Design3DViewer
                  model={approvedDesignVersion.model ? { url: approvedDesignVersion.model.url, format: approvedDesignVersion.model.format } : null}
                  fallbackImageUrl={approvedDesignVersion.previewImageUrl}
                  className="h-full min-h-[320px]"
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {version?.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="text-muted-foreground">{formatCurrency(item.subtotal, currency)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {version && (version.productionDays || version.estimatedDeliveryDate || version.includedRevisions != null) && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery &amp; Revisions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {version.productionDays && (
                  <p>
                    <span className="font-medium text-foreground">Production Time: </span>
                    {version.productionDays} days
                  </p>
                )}
                {version.estimatedDeliveryDate && (
                  <p>
                    <span className="font-medium text-foreground">Estimated Delivery: </span>
                    {formatDate(version.estimatedDeliveryDate)}
                  </p>
                )}
                {version.includedRevisions != null && (
                  <p>
                    <span className="font-medium text-foreground">Included Revisions: </span>
                    {version.includedRevisions}
                    {version.additionalRevisionCost ? ` (additional revisions ${formatCurrency(version.additionalRevisionCost, currency)} each)` : ""}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {version && (version.paymentTerms || version.cancellationPolicy || version.refundPolicy || version.lateChangePolicy) && (
            <Card>
              <CardHeader>
                <CardTitle>Terms &amp; Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {version.paymentTerms && (
                  <p>
                    <span className="font-medium text-foreground">Payment Terms: </span>
                    {version.paymentTerms}
                  </p>
                )}
                {version.cancellationPolicy && (
                  <p>
                    <span className="font-medium text-foreground">Cancellation: </span>
                    {version.cancellationPolicy}
                  </p>
                )}
                {version.refundPolicy && (
                  <p>
                    <span className="font-medium text-foreground">Refund Policy: </span>
                    {version.refundPolicy}
                  </p>
                )}
                {version.lateChangePolicy && (
                  <p>
                    <span className="font-medium text-foreground">Late Change Policy: </span>
                    {version.lateChangePolicy}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {measurementEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Measurements Used</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3">
                  {measurementEntries.map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</dt>
                      <dd className="font-medium text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bundle.comments.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
              {bundle.comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-border p-3 text-sm">
                  <p className="mb-1 text-xs text-muted-foreground">
                    {comment.authorType === "CUSTOMER" ? "You" : (comment.author?.name ?? business?.name)} · {formatDate(comment.createdAt)}
                  </p>
                  <p className="text-foreground">{comment.body}</p>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setAskOpen(true)} className="gap-1.5">
                <MessageSquare className="size-3.5" /> Ask a Question
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Price Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatCurrency(version?.subtotal ?? 0, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-foreground">-{formatCurrency(version?.discount ?? 0, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">{formatCurrency(version?.tax ?? 0, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-foreground">{formatCurrency(version?.deliveryFee ?? 0, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{formatCurrency(version?.total ?? 0, currency)}</span>
              </div>
            </CardContent>
          </Card>

          {canDecide && !isFinal ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <Button className="w-full gap-1.5" onClick={() => setAcceptOpen(true)}>
                  <ShieldCheck className="size-4" /> Accept Quote
                </Button>
                <Button variant="destructive" className="w-full" onClick={() => setDeclineOpen(true)}>
                  Reject Quote
                </Button>
                <Button asChild variant="ghost" className="w-full gap-1.5">
                  <a href={`/api/customer/quotations/${quotationId}/pdf`} target="_blank" rel="noreferrer">
                    <Download className="size-4" /> Download PDF
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Your Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <p className="text-sm text-muted-foreground">
                  {quotation.status === "ACCEPTED" || quotation.status === "CONVERTED"
                    ? "You've accepted this quotation. Thank you!"
                    : quotation.status === "DECLINED"
                      ? "You've declined this quotation."
                      : "This quotation isn't awaiting your decision right now."}
                </p>
                <Button asChild variant="outline" className="w-full gap-1.5">
                  <a href={`/api/customer/quotations/${quotationId}/pdf`} target="_blank" rel="noreferrer">
                    <Download className="size-4" /> Download PDF
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Accept this quotation?</DialogTitle>
            <DialogDescription>
              You are accepting this quotation for {formatCurrency(version?.total ?? 0, currency)}. This will generate your order agreement and
              you&apos;ll be asked to pay in full to secure your order.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleAccept} disabled={submitting}>
              {submitting ? "Accepting..." : "Accept Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this quotation?</DialogTitle>
            <DialogDescription>{business?.name} will be notified.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={submitting}>
              {submitting ? "Rejecting..." : "Reject Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ask a question</DialogTitle>
            <DialogDescription>e.g. &quot;Can you reduce the delivery fee?&quot; or &quot;Can I supply my own fabric?&quot;</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={askBody} onChange={(e) => setAskBody(e.target.value)} placeholder="Type your question..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAskOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleAsk} disabled={submitting || !askBody.trim()}>
              {submitting ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
