import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Shirt, ShoppingBag, Wallet, Landmark, History, Flag, AlertTriangle, Undo2, BadgeCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { AdminPaymentActions } from "@/features/admin/components/admin-payment-actions";
import { getAdminPaymentDetail, ESCROW_STATUS_LABELS } from "@/lib/admin-payments";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";

const VERIFICATION_BADGE: Record<string, { label: string; className: string }> = {
  UNVERIFIED: { label: "Unverified", className: "bg-muted text-muted-foreground" },
  PENDING: { label: "Pending verification", className: "bg-warning-soft text-warning" },
  VERIFIED: { label: "Verified", className: "bg-success-soft text-success" },
  REJECTED: { label: "Verification rejected", className: "bg-danger-soft text-danger" },
  SUSPENDED: { label: "Suspended", className: "bg-danger-soft text-danger" },
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  INITIALIZED: "bg-muted text-muted-foreground",
  PROCESSING: "bg-info-soft text-info",
  SUCCESSFUL: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
  CANCELLED: "bg-muted text-muted-foreground",
  AMOUNT_MISMATCH: "bg-danger-soft text-danger",
  REFUND_PENDING: "bg-warning-soft text-warning",
  PARTIALLY_REFUNDED: "bg-warning-soft text-warning",
  FULLY_REFUNDED: "bg-muted text-muted-foreground",
  DISPUTED: "bg-danger-soft text-danger",
  REVERSED: "bg-danger-soft text-danger",
};

const ESCROW_STATUS_BADGE: Record<string, string> = {
  AWAITING_PAYMENT: "bg-muted text-muted-foreground",
  HELD_IN_ESCROW: "bg-info-soft text-info",
  ELIGIBLE_FOR_RELEASE: "bg-success-soft text-success",
  PENDING_APPROVAL: "bg-warning-soft text-warning",
  RELEASED: "bg-success-soft text-success",
  REFUNDED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
};

const PAYOUT_STATUS_BADGE: Record<string, string> = {
  NOT_ELIGIBLE: "bg-muted text-muted-foreground",
  PENDING: "bg-muted text-muted-foreground",
  ELIGIBLE: "bg-info-soft text-info",
  ON_HOLD: "bg-warning-soft text-warning",
  PROCESSING: "bg-warning-soft text-warning",
  PAID: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
  REVERSED: "bg-danger-soft text-danger",
};

function maskAccountNumber(accountNumber: string) {
  if (accountNumber.length <= 4) return accountNumber;
  return `${"•".repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}`;
}

// Admin Phase 7 payment detail. Every figure below reads from Payment,
// Payout, Refund, Dispute, and FinancialTransaction — see
// lib/admin-payments.ts for how Escrow Status is derived and why. "Admin
// cannot edit payment amounts" (the brief's own rule): nothing on this page
// writes to Payment at all — every action available here changes a Payout,
// creates a Refund, or writes an audit/note entry, never the Payment row
// itself.
export default async function AdminPaymentDetailPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const detail = await getAdminPaymentDetail(paymentId);
  if (!detail) notFound();

  const { payment, payout, activeDispute, financialHistory, recipient, escrowStatus, fraud, chargeback } = detail;
  const verification = VERIFICATION_BADGE[payment.business.verification?.status ?? "UNVERIFIED"] ?? VERIFICATION_BADGE.UNVERIFIED;
  const customerName = `${payment.customer.firstName} ${payment.customer.lastName}`.trim();
  const successfulRefunds = payment.refunds.filter((r) => r.status === "SUCCESSFUL");
  const refundedAmount = successfulRefunds.reduce((sum, r) => sum + r.amount, 0);
  const refundableAmount = payment.status === "SUCCESSFUL" ? Math.max(0, payment.amount - refundedAmount) : 0;
  const releasedAmount = payout?.status === "PAID" ? payout.netAmount : 0;
  const currentBalance = Math.max(0, payment.amount - refundedAmount - releasedAmount);
  const latestPayoutHistory = payout?.statusHistory[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/payments" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to Payments
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">{payment.id}</h1>
              <Badge className={PAYMENT_STATUS_BADGE[payment.status] ?? "bg-muted text-muted-foreground"}>{payment.status.replace(/_/g, " ")}</Badge>
              <Badge className={ESCROW_STATUS_BADGE[escrowStatus]}>{ESCROW_STATUS_LABELS[escrowStatus]}</Badge>
              {fraud && (
                <Badge className="gap-1 bg-danger-soft text-danger" title={fraud.reason}>
                  <Flag className="size-3" /> Fraud Review
                </Badge>
              )}
              {chargeback && !fraud && (
                <Badge className="gap-1 bg-danger-soft text-danger" title={chargeback.reason}>
                  <AlertTriangle className="size-3" /> Chargeback
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {customerName} → {payment.business.name} · Order{" "}
              <Link href={`/admin/orders/${payment.orderId}`} className="text-primary hover:underline">
                {payment.order.orderCode}
              </Link>
            </p>
          </div>
          <AdminPaymentActions paymentId={payment.id} payoutId={payout?.id ?? null} payoutStatus={payout?.status ?? null} isFlagged={!!fraud} refundableAmount={refundableAmount} currency={payment.currency} />
        </div>
      </div>

      {activeDispute && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-danger/20 bg-danger-soft/40 px-4 py-3 text-sm text-danger">
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <strong>Open dispute</strong> — escrow release is blocked until it&apos;s resolved ({activeDispute.issueType.replace(/_/g, " ")}).
          </span>
          <Link href={`/admin/disputes/${activeDispute.id}`} className="shrink-0 font-medium hover:underline">
            View Dispute
          </Link>
        </div>
      )}

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Amount Paid</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(payment.amount, payment.currency)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Platform Fee</p>
            <p className="mt-1 text-sm text-foreground">{payout ? formatCurrency(payout.platformFee, payment.currency) : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Net Designer Amount</p>
            <p className="mt-1 text-sm text-foreground">{payout ? formatCurrency(payout.netAmount, payment.currency) : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Payment Date</p>
            <p className="mt-1 text-sm text-foreground">{payment.paidAt ? formatDate(payment.paidAt) : "Not yet paid"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Customer */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <User className="size-4" /> Customer
                </span>
                {payment.order.customerProfile && (
                  <Link href={`/admin/customers/${payment.order.customerProfile.id}`} className="text-xs font-medium text-primary hover:underline">
                    Full profile
                  </Link>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Name</dt>
                  <dd className="text-foreground">
                    {customerName} <span className="font-mono text-[11px] text-muted-foreground">({payment.customer.customerCode})</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="text-foreground">{payment.customer.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd className="text-foreground">{payment.customer.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Invoice</dt>
                  <dd className="text-foreground">{payment.invoice.invoiceNumber}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Designer */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <Shirt className="size-4" /> Designer
                </span>
                <Link href={`/admin/businesses/${payment.business.id}`} className="text-xs font-medium text-primary hover:underline">
                  Full profile
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Business</dt>
                  <dd className="text-foreground">{payment.business.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Verification</dt>
                  <dd>
                    <Badge className={verification.className}>
                      <BadgeCheck className="size-3" /> {verification.label}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="size-4" /> Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Method</dt>
                  <dd className="text-foreground">{payment.method.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Provider</dt>
                  <dd className="text-foreground">{payment.provider}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Gateway Reference</dt>
                  <dd className="font-mono text-xs text-foreground">{payment.providerReference ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Transaction Reference</dt>
                  <dd className="font-mono text-xs text-foreground">{payment.idempotencyKey}</dd>
                </div>
                {payment.recordedBy?.name && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Recorded By</dt>
                    <dd className="text-foreground">{payment.recordedBy.name}</dd>
                  </div>
                )}
                {payment.notes && (
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Notes</dt>
                    <dd className="text-foreground">{payment.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Escrow Details */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="size-4" /> Escrow Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Funds Received</dt>
                  <dd className="text-foreground">{payment.status === "SUCCESSFUL" || refundedAmount > 0 || releasedAmount > 0 ? formatCurrency(payment.amount, payment.currency) : "Not yet"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Current Balance Held</dt>
                  <dd className="font-medium text-foreground">{formatCurrency(currentBalance, payment.currency)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Funds Released</dt>
                  <dd className="text-foreground">{formatCurrency(releasedAmount, payment.currency)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Release Date</dt>
                  <dd className="text-foreground">{payout?.paidAt ? formatDate(payout.paidAt) : "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Release Reason</dt>
                  <dd className="text-foreground">{payout?.status === "PAID" ? "Order fulfilled, delivered, and confirmed (or the confirmation window expired with no dispute)." : latestPayoutHistory?.note ?? "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Payout Management */}
          {payout && (
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingBag className="size-4" /> Payout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Designer</dt>
                    <dd className="text-foreground">{payment.business.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Amount</dt>
                    <dd className="text-foreground">{formatCurrency(payout.netAmount, payment.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Status</dt>
                    <dd>
                      <Badge className={PAYOUT_STATUS_BADGE[payout.status] ?? "bg-muted text-muted-foreground"}>{payout.status.replace(/_/g, " ")}</Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Reference</dt>
                    <dd className="font-mono text-xs text-foreground">{payout.providerReference ?? "—"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Bank Account</dt>
                    <dd className="text-foreground">
                      {recipient ? (
                        <>
                          {recipient.bankName} · {maskAccountNumber(recipient.accountNumber)} · {recipient.accountName ?? "unverified name"}{" "}
                          <Badge variant="outline" className="ml-1">
                            {recipient.kycStatus.replace(/_/g, " ")}
                          </Badge>
                        </>
                      ) : (
                        "No payout account on file"
                      )}
                    </dd>
                  </div>
                  {payout.failureReason && (
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">Failure Reason</dt>
                      <dd className="text-danger">{payout.failureReason}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Refunds */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Undo2 className="size-4" /> Refunds
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payment.refunds.length === 0 ? (
                <EmptyState icon={Undo2} title="No refunds on this payment" className="border-none py-8" />
              ) : (
                <div className="space-y-2">
                  {payment.refunds.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{formatCurrency(r.amount, payment.currency)}</span>
                        <Badge variant="outline">{r.status}</Badge>
                        <Badge variant="outline">{r.type}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.processedBy?.name ?? "System"} · {formatDate(r.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Payment Timeline */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" /> Payment Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {financialHistory.length === 0 ? (
                <EmptyState icon={History} title="No financial history recorded" className="border-none py-8" />
              ) : (
                <ul className="space-y-3">
                  {financialHistory.map((t) => (
                    <li key={t.id} className="flex gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm text-foreground">{t.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.actor?.name ?? "System"} · {formatRelativeTime(t.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
