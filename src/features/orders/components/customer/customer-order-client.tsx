"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CreditCard, Download, ShieldCheck, Star, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Logo } from "@/shared/components/logo";
import { OrderTimelineView } from "@/features/orders/components/order-timeline-view";
import { CustomerProductionTracker } from "@/features/orders/components/customer/customer-production-tracker";
import { CustomerDeliveryTracker } from "@/features/orders/components/customer/customer-delivery-tracker";
import { CustomerDisputeCard } from "@/features/orders/components/customer/customer-dispute-card";
import { ReviewFormDialog } from "@/features/reviews/components/review-form-dialog";
import { StarRating } from "@/shared/components/star-rating";
import type { OrderTimelineEntryData, DeliveryData, ProductionUpdateData } from "@/features/orders/types";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { PAYMENT_PROTECTION_STATEMENT } from "@/lib/payment-architecture";

interface OrderBundle {
  order: {
    id: string;
    orderCode: string;
    status: string;
    paymentStatus: string;
    totalValue: number;
    amountPaid: number;
    balanceDue: number;
    expectedCompletionDate: string | null;
    createdAt: string;
    isDelayed: boolean;
    delayReason: string | null;
  };
  agreement: {
    id: string;
    totalPrice: number;
    currency: string;
    deliveryEstimate: string | null;
    productionDeadline: string | null;
    paymentTerms: string | null;
    cancellationPolicy: string | null;
    refundPolicy: string | null;
    customerAcceptedAt: string;
    businessAcceptedAt: string;
  } | null;
  invoice: { id: string; invoiceNumber: string; total: number; balanceDue: number; status: string } | null;
  payments: { id: string; amount: number; currency: string; status: string; method: string; paidAt: string | null; createdAt: string; receipt: { id: string; receiptNumber: string } | null }[];
  timeline: OrderTimelineEntryData[];
  business: { id: string; name: string; logoUrl: string | null; currency: string } | null;
  designPreview: { id: string; name: string; previewCode: string } | null;
  assignedDesigner: { id: string; name: string | null } | null;
  productionStages: { id: string; name: string; status: string; startDate: string | null; completionDate: string | null }[];
  productionUpdates: ProductionUpdateData[];
  delivery: DeliveryData | null;
  dispute: { id: string; status: string; issueType: string; createdAt: string } | null;
  review: { id: string; overallRating: number; status: string } | null;
  platformFeePercentage: number;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_CONFIRMATION: "Pending Confirmation",
  CONFIRMED: "Confirmed",
  AWAITING_PAYMENT: "Awaiting Payment",
  READY_FOR_PRODUCTION: "Ready for Production",
  IN_PRODUCTION: "In Production",
  FITTING: "Fitting",
  ALTERATION: "Alteration",
  FINAL_INSPECTION: "Final Inspection",
  QUALITY_CHECK: "Quality Check",
  QUALITY_CHECK_FAILED: "Quality Check",
  COMPLETED: "Completed",
  READY_FOR_PICKUP: "Ready for Delivery",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  DISPUTED: "Disputed",
  REFUND_PROCESSING: "Refund Processing",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
  ON_HOLD: "On Hold",
};

export function CustomerOrderClient({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Captured once on mount so it survives the router.replace() below
  // stripping the query param — re-reading searchParams live would make the
  // dialog vanish the instant the URL is cleaned up.
  const [paymentReturn] = useState(() => searchParams.get("reference") ?? searchParams.get("trxref"));
  const [paymentDialogDismissed, setPaymentDialogDismissed] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [bundle, setBundle] = useState<OrderBundle | null>(null);
  const [paying, setPaying] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const hasLoadedRef = useRef(false);
  const showPaymentDialog = !!paymentReturn && !paymentDialogDismissed;

  async function load() {
    try {
      const res = await fetch(`/api/customer/orders/${orderId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "Could not load this order.");
        setLoadState("error");
        return null;
      }
      setBundle(data);
      setLoadState("ready");
      return data as OrderBundle;
    } catch {
      setErrorMessage("Something went wrong loading this order. Please check your connection and try again.");
      setLoadState("error");
      return null;
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Post-payment confirmation screen — shown on return from the provider's
  // hosted checkout (reference/trxref in the URL). This never trusts that
  // redirect as proof of payment: it only decides whether to show the
  // dialog and briefly poll; the actual PAID status always comes from the
  // server, set only once the webhook's provider-verified amount matches
  // (see lib/payment-recording.ts). If it's still not confirmed after
  // polling, the copy says so honestly instead of claiming success.
  useEffect(() => {
    if (!paymentReturn) return;
    router.replace(`/account/orders/${orderId}`, { scroll: false });

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      const data = await load();
      if (data?.order.paymentStatus === "PAID" || attempts >= 5) {
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentReturn]);

  async function handlePayNow() {
    setPaying(true);
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/pay`, { method: "POST" });
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
        <h1 className="mt-5 text-xl font-semibold text-foreground">Couldn&apos;t load this order</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  const { order, agreement, invoice, payments, timeline, business, designPreview, assignedDesigner, platformFeePercentage } = bundle;
  const currency = business?.currency ?? "NGN";
  const needsPayment = order.paymentStatus !== "PAID" && invoice && invoice.balanceDue > 0;
  const paymentVerified = order.paymentStatus === "PAID";

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
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Order</p>
            <p className="font-semibold text-foreground">{business?.name}</p>
          </div>
        </div>
        <Badge variant="outline">{STATUS_LABELS[order.status] ?? order.status}</Badge>
      </header>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{designPreview?.name ?? order.orderCode}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {order.orderCode}
          {assignedDesigner ? ` · Designer: ${assignedDesigner.name}` : ""}
        </p>
      </div>

      {paymentVerified && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-success/20 bg-success-soft p-4">
          <ShieldCheck className="size-5 shrink-0 text-success" />
          <p className="text-sm font-medium text-success">Payment verified, your order is confirmed and ready for production.</p>
        </div>
      )}

      {order.status === "COMPLETED" && !bundle.review && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-accent-soft p-4">
          <div className="flex items-center gap-3">
            <Star className="size-5 shrink-0 text-primary" />
            <p className="text-sm font-medium text-foreground">How was your experience with {business?.name}?</p>
          </div>
          <Button size="sm" onClick={() => setReviewOpen(true)}>
            Leave a Review
          </Button>
        </div>
      )}

      {bundle.review && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
          <StarRating value={bundle.review.overallRating} showValue />
          <p className="text-sm text-muted-foreground">
            {bundle.review.status === "PUBLISHED" ? "Your review is published." : "Your review is being checked before it goes live."}
          </p>
        </div>
      )}

      {bundle.dispute && (
        <div className="mb-6">
          <CustomerDisputeCard orderId={orderId} />
        </div>
      )}

      {bundle.delivery && (
        <div className="mb-6">
          <CustomerDeliveryTracker orderId={orderId} delivery={bundle.delivery} hasDispute={!!bundle.dispute} onChanged={load} />
        </div>
      )}

      <div className="mb-6">
        <CustomerProductionTracker
          orderId={orderId}
          stages={bundle.productionStages}
          updates={bundle.productionUpdates}
          isDelayed={order.isDelayed}
          delayReason={order.delayReason}
          expectedCompletionDate={order.expectedCompletionDate}
          onChanged={load}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {agreement && (
            <Card>
              <CardHeader>
                <CardTitle>Order Agreement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Price</span>
                  <span className="font-semibold text-foreground">{formatCurrency(agreement.totalPrice, agreement.currency)}</span>
                </div>
                {agreement.deliveryEstimate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Delivery</span>
                    <span className="text-foreground">{formatDate(agreement.deliveryEstimate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You accepted</span>
                  <span className="text-foreground">{formatDate(agreement.customerAcceptedAt)}</span>
                </div>
                {agreement.cancellationPolicy && (
                  <p className="pt-2 text-muted-foreground">
                    <span className="font-medium text-foreground">Cancellation: </span>
                    {agreement.cancellationPolicy}
                  </p>
                )}
                {agreement.refundPolicy && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Refund Policy: </span>
                    {agreement.refundPolicy}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimelineView timeline={timeline} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments yet.</p>
              ) : (
                <ul className="space-y-2">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{formatCurrency(p.amount, p.currency)}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.status} · {p.paidAt ? formatDate(p.paidAt) : formatRelativeTime(p.createdAt)}
                        </p>
                      </div>
                      {p.receipt && (
                        <Button asChild size="sm" variant="ghost" className="gap-1.5">
                          <a href={`/api/customer/orders/${orderId}/receipts/${p.receipt.id}/pdf`} target="_blank" rel="noreferrer">
                            <Download className="size-3.5" /> Receipt
                          </a>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {needsPayment && (
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Designer</span>
                  <span className="text-foreground">{assignedDesigner?.name ?? "Not yet assigned"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Business</span>
                  <span className="text-foreground">{business?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Design</span>
                  <span className="text-foreground">{designPreview?.name ?? order.orderCode}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5">
                  <span className="text-muted-foreground">Order Total</span>
                  <span className="text-foreground">{formatCurrency(order.totalValue, currency)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Fashion360 Fee ({platformFeePercentage}%, paid by your designer)</span>
                  <span className="text-muted-foreground">{formatCurrency(order.totalValue * (platformFeePercentage / 100), currency)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Payment Processing Fee</span>
                  <span className="text-muted-foreground">Set by your payment provider at checkout</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                  <span className="text-foreground">Total You Pay</span>
                  <span className="text-foreground">{formatCurrency(order.totalValue, currency)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-foreground">{formatCurrency(order.totalValue, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span className="text-foreground">{formatCurrency(order.amountPaid, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <span className="text-foreground">Balance Due</span>
                <span className="text-foreground">{formatCurrency(order.balanceDue, currency)}</span>
              </div>
            </CardContent>
          </Card>

          {needsPayment && (
            <Card>
              <CardHeader>
                <CardTitle>Complete Your Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <p className="text-sm text-muted-foreground">{PAYMENT_PROTECTION_STATEMENT}</p>
                <p className="text-xs text-muted-foreground">
                  By paying, you agree to Fashion360&apos;s{" "}
                  <a href="/legal/payment-policy#cancellation" className="underline">
                    Cancellation
                  </a>
                  ,{" "}
                  <a href="/legal/payment-policy#refund" className="underline">
                    Refund
                  </a>{" "}
                  and{" "}
                  <a href="/legal/payment-policy#dispute" className="underline">
                    Dispute
                  </a>{" "}
                  policies.
                </p>
                <Button className="w-full gap-1.5" onClick={handlePayNow} disabled={paying}>
                  <CreditCard className="size-4" /> {paying ? "Redirecting..." : `Pay Securely: ${formatCurrency(invoice?.balanceDue ?? 0, currency)}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ReviewFormDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        orderId={orderId}
        businessName={business?.name ?? "this business"}
        onDone={load}
      />

      <Dialog open={showPaymentDialog} onOpenChange={(open) => !open && setPaymentDialogDismissed(true)}>
        <DialogContent className="sm:max-w-sm">
          {order.paymentStatus === "PAID" ? (
            <>
              <DialogHeader className="items-center text-center">
                <CheckCircle2 className="size-10 text-success" />
                <DialogTitle>Payment Verified</DialogTitle>
                <DialogDescription>Your payment for {order.orderCode} has been confirmed.</DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 rounded-xl border border-border bg-surface p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span className="text-foreground">{order.orderCode}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount Paid</span><span className="text-foreground">{formatCurrency(order.amountPaid, currency)}</span></div>
                {paymentReturn && <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="truncate text-foreground">{paymentReturn}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-success">Verified</span></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {order.balanceDue > 0
                  ? "Next: your remaining balance is still due, see the balance card below."
                  : "Next: your designer has been notified and can begin production."}
              </p>
              <Button className="w-full" onClick={() => setPaymentDialogDismissed(true)}>
                Done
              </Button>
            </>
          ) : (
            <>
              <DialogHeader className="items-center text-center">
                <Loader2 className="size-10 animate-spin text-muted-foreground" />
                <DialogTitle>Confirming Your Payment</DialogTitle>
                <DialogDescription>
                  We&apos;re verifying your payment directly with the provider, this usually takes a few seconds. This
                  page will update automatically; it&apos;s safe to close it and check back.
                </DialogDescription>
              </DialogHeader>
              <Button variant="outline" className="w-full" onClick={() => setPaymentDialogDismissed(true)}>
                Close
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
