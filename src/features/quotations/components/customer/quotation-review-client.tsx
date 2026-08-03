"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/shared/components/logo";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface QuotationReviewBundle {
  quotation: {
    id: string;
    quotationNumber: string;
    status: string;
    expiresAt: string | null;
    business: { name: string; logoUrl: string | null; email: string | null; phone: string | null; currency: string };
    customer: { firstName: string; lastName: string };
    order: { orderCode: string };
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
    depositPercentage: number;
    depositRequired: number;
    balanceDue: number;
    paymentTerms: string | null;
    cancellationPolicy: string | null;
    refundPolicy: string | null;
    items: { id: string; name: string; quantity: number; unitPrice: number; subtotal: number }[];
  }[];
  comments: { id: string; authorType: string; body: string; createdAt: string }[];
  revisionRequests: { id: string; body: string; status: string; createdAt: string }[];
}

const FINAL_STATUSES = new Set(["ACCEPTED", "DECLINED", "CONVERTED"]);

const STATUS_META: Record<string, { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  DRAFT: { label: "Preparing Quotation", tone: "neutral" },
  SENT: { label: "Awaiting Your Review", tone: "warning" },
  VIEWED: { label: "Awaiting Your Review", tone: "warning" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  CONVERTED: { label: "Accepted: Invoice Issued", tone: "success" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

export function QuotationReviewClient({ token }: { token: string }) {
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [bundle, setBundle] = useState<QuotationReviewBundle | null>(null);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseBody, setReviseBody] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasLoadedRef = useRef(false);

  async function load() {
    try {
      const res = await fetch(`/api/quotation-share/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "This link is no longer valid.");
        setLoadState("error");
        return;
      }
      setBundle(data);
      setLoadState("ready");
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
  }, [token]);

  async function handleAccept() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotation-share/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "ACCEPTED", confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not accept this quotation");
      toast.success("Quotation accepted, thank you!");
      setAcceptOpen(false);
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
      const res = await fetch(`/api/quotation-share/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "DECLINED", confirm: true }),
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

  async function handleRevise() {
    if (!reviseBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotation-share/${token}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reviseBody, versionId: bundle?.versions[0]?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send your request");
      toast.success("Your requested changes were sent to the business.");
      setReviseOpen(false);
      setReviseBody("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your request");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComment() {
    if (!commentBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotation-share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody, versionId: bundle?.versions[0]?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not post your comment");
      setCommentBody("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post your comment");
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

  const { quotation } = bundle;
  const currency = quotation.business.currency;
  const version = bundle.versions[0] ?? null;
  const isFinal = FINAL_STATUSES.has(quotation.status);
  const meta = STATUS_META[quotation.status] ?? { label: quotation.status, tone: "neutral" as const };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className="flex items-center gap-3">
          {quotation.business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={quotation.business.logoUrl} alt={quotation.business.name} className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-border" />
          ) : (
            <Logo mark />
          )}
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Quotation Review</p>
            <p className="font-semibold text-foreground">{quotation.business.name}</p>
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold", TONE_CLASSES[meta.tone])}>
          {meta.label}
        </span>
      </header>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          Quotation for {quotation.customer.firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {quotation.quotationNumber} · Order {quotation.order.orderCode}
          {quotation.expiresAt && ` · Expires ${formatDate(quotation.expiresAt)}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
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

          {(version?.paymentTerms || version?.cancellationPolicy || version?.refundPolicy) && (
            <Card>
              <CardHeader>
                <CardTitle>Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {version?.paymentTerms && <p><span className="font-medium text-foreground">Payment Terms: </span>{version.paymentTerms}</p>}
                {version?.cancellationPolicy && <p><span className="font-medium text-foreground">Cancellation: </span>{version.cancellationPolicy}</p>}
                {version?.refundPolicy && <p><span className="font-medium text-foreground">Refund Policy: </span>{version.refundPolicy}</p>}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bundle.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
              {bundle.comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-border p-3 text-sm">
                  <p className="mb-1 text-xs text-muted-foreground">
                    {comment.authorType === "CUSTOMER" ? "You" : quotation.business.name} · {formatDate(comment.createdAt)}
                  </p>
                  <p className="text-foreground">{comment.body}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <Textarea rows={2} value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Add a comment..." />
              </div>
              <Button size="sm" variant="outline" onClick={handleComment} disabled={submitting || !commentBody.trim()} className="gap-1.5">
                <MessageSquare className="size-3.5" /> Post Comment
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
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{formatCurrency(version?.total ?? 0, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit Required</span>
                <span className="text-foreground">{formatCurrency(version?.depositRequired ?? 0, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Balance</span>
                <span className="text-foreground">{formatCurrency(version?.balanceDue ?? 0, currency)}</span>
              </div>
            </CardContent>
          </Card>

          {!isFinal ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <Button className="w-full gap-1.5" onClick={() => setAcceptOpen(true)}>
                  <ShieldCheck className="size-4" /> Accept Quotation
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setReviseOpen(true)}>
                  Request Changes
                </Button>
                <Button variant="destructive" className="w-full" onClick={() => setDeclineOpen(true)}>
                  Decline Quotation
                </Button>
                <Button asChild variant="ghost" className="w-full gap-1.5">
                  <a href={`/api/quotation-share/${token}/pdf`} target="_blank" rel="noreferrer">
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
                    : "You've declined this quotation."}
                </p>
                <Button asChild variant="outline" className="w-full gap-1.5">
                  <a href={`/api/quotation-share/${token}/pdf`} target="_blank" rel="noreferrer">
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
              You are accepting this quotation for {formatCurrency(version?.total ?? 0, currency)}. {quotation.business.name} will be notified
              and may proceed to invoice you.
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
            <DialogTitle>Decline this quotation?</DialogTitle>
            <DialogDescription>{quotation.business.name} will be notified.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={submitting}>
              {submitting ? "Declining..." : "Decline Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviseOpen} onOpenChange={setReviseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
            <DialogDescription>Describe what you'd like changed on this quotation.</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={reviseBody} onChange={(e) => setReviseBody(e.target.value)} placeholder="e.g. Please use a darker fabric and remove the delivery fee." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviseOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleRevise} disabled={submitting || !reviseBody.trim()}>
              {submitting ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
