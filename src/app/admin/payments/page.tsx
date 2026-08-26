import Link from "next/link";
import { CreditCard, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { getAdminPaymentList, getAdminPaymentStats, getPaymentsNeedingFraudReview, ESCROW_STATUS_LABELS, type EscrowStatus } from "@/lib/admin-payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaymentStatus, PayoutStatus, RefundStatus, PaymentMethod, PaymentProviderType } from "@prisma/client";

const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ["PENDING", "INITIALIZED", "PROCESSING", "SUCCESSFUL", "FAILED", "CANCELLED", "AMOUNT_MISMATCH", "REFUND_PENDING", "PARTIALLY_REFUNDED", "FULLY_REFUNDED", "DISPUTED", "REVERSED"];
const PAYOUT_STATUS_OPTIONS: PayoutStatus[] = ["NOT_ELIGIBLE", "PENDING", "ELIGIBLE", "ON_HOLD", "PROCESSING", "PAID", "FAILED", "REVERSED"];
const REFUND_STATUS_OPTIONS: RefundStatus[] = ["PENDING", "SUCCESSFUL", "FAILED"];
const ESCROW_STATUS_OPTIONS: EscrowStatus[] = ["AWAITING_PAYMENT", "HELD_IN_ESCROW", "ELIGIBLE_FOR_RELEASE", "PENDING_APPROVAL", "RELEASED", "REFUNDED", "CANCELLED"];

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

const ESCROW_STATUS_BADGE: Record<EscrowStatus, string> = {
  AWAITING_PAYMENT: "bg-muted text-muted-foreground",
  HELD_IN_ESCROW: "bg-info-soft text-info",
  ELIGIBLE_FOR_RELEASE: "bg-success-soft text-success",
  PENDING_APPROVAL: "bg-warning-soft text-warning",
  RELEASED: "bg-success-soft text-success",
  REFUNDED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
};

function StatChip({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6">
        <p className="text-xl font-semibold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
}

// Admin Phase 7: Payment & Escrow Management. Platform-wide oversight of
// Payment, Payout, Refund, and Dispute — every model already real and
// already driving the platform's actual money movement (see
// lib/payment-architecture.ts and lib/admin-payments.ts's own audit
// summary). This page is new (the brief asks for /admin/payments
// specifically), but /admin/payouts — the pre-existing "Payments" nav
// destination — is left untouched; this page links out to it for payout-
// recipient KYC verification, which is a distinct concern (verifying a bank
// account belongs to a business) from monitoring and acting on individual
// payments. Same list-page shape every prior Admin phase already
// established: server-rendered GET form, no client JS needed to search/
// filter/paginate.
export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = {
    q: sp.q,
    status: sp.status as PaymentStatus | undefined,
    escrowStatus: sp.escrowStatus as EscrowStatus | undefined,
    payoutStatus: sp.payoutStatus as PayoutStatus | undefined,
    refundStatus: sp.refundStatus as RefundStatus | undefined,
    method: sp.method as PaymentMethod | undefined,
    provider: sp.provider as PaymentProviderType | undefined,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    highValue: sp.highValue === "true",
    fraudOnly: sp.fraudOnly === "true",
    designerId: sp.designerId,
    customerId: sp.customerId,
    page: sp.page ? Number(sp.page) : 1,
  };

  const [stats, { payments, total, page, totalPages }, fraudItems] = await Promise.all([
    getAdminPaymentStats(),
    getAdminPaymentList(params),
    getPaymentsNeedingFraudReview(),
  ]);

  const hasFilters = !!(
    params.q || params.status || params.escrowStatus || params.payoutStatus || params.refundStatus || params.method || params.provider || params.dateFrom || params.dateTo || params.highValue || params.fraudOnly
  );
  const hasScopeFilter = !!(params.designerId || params.customerId);

  function pageHref(targetPage: number) {
    const next = new URLSearchParams(sp as Record<string, string>);
    next.set("page", String(targetPage));
    return `/admin/payments?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payments &amp; Escrow</h1>
          <p className="text-sm text-muted-foreground">Every payment, its escrow status, and the payout it funds — platform-wide.</p>
        </div>
        <Link href="/admin/payouts" className="text-xs font-medium text-primary hover:underline">
          Payout recipient verification →
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatChip label="Total Revenue" value={fmt(stats.totalRevenue)} />
        <StatChip label="Escrow Balance" value={fmt(stats.escrowBalance)} hint="Held by Fashion360" />
        <StatChip label="Pending Payments" value={String(stats.pendingPayments)} />
        <StatChip label="Successful Payments" value={String(stats.successfulPayments)} />
        <StatChip label="Failed Payments" value={String(stats.failedPayments)} />
        <StatChip label="Pending Payouts" value={fmt(stats.pendingPayouts)} hint={`${stats.pendingPayoutsCount} orders`} />
        <StatChip label="Completed Payouts" value={String(stats.completedPayouts)} />
        <StatChip label="Refund Requests" value={String(stats.refundRequests)} />
      </div>

      {/* Fraud review */}
      {fraudItems.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-danger uppercase">
            <Flag className="size-3.5" /> Fraud Review
          </h2>
          <div className="space-y-2">
            {fraudItems.map((item) => (
              <div key={item.paymentId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger-soft/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.reason} · <span className="font-mono text-xs text-muted-foreground">{item.orderCode}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.designerName} · {formatCurrency(item.amount, item.currency)}
                  </p>
                </div>
                <Link href={`/admin/payments/${item.paymentId}`}>
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasScopeFilter && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2 text-sm">
          <span className="text-muted-foreground">Showing payments for one {params.designerId ? "designer" : "customer"} only.</span>
          <Link href="/admin/payments" className="text-xs font-medium text-primary hover:underline">
            Show all payments
          </Link>
        </div>
      )}

      <form className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        {params.designerId && <input type="hidden" name="designerId" value={params.designerId} />}
        {params.customerId && <input type="hidden" name="customerId" value={params.customerId} />}
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Search by payment ID, transaction reference, order number, customer, or designer..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All payment statuses</option>
            {PAYMENT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select name="escrowStatus" defaultValue={params.escrowStatus ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All escrow statuses</option>
            {ESCROW_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ESCROW_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select name="payoutStatus" defaultValue={params.payoutStatus ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All payout statuses</option>
            {PAYOUT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select name="refundStatus" defaultValue={params.refundStatus ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All refund statuses</option>
            {REFUND_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select name="method" defaultValue={params.method ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All methods</option>
            <option value="ONLINE">Online</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
            <option value="POS">POS</option>
            <option value="CARD">Card</option>
            <option value="OTHER">Other</option>
          </select>
          <select name="provider" defaultValue={params.provider ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All providers</option>
            <option value="FLUTTERWAVE">Flutterwave</option>
            <option value="PAYSTACK">Paystack</option>
            <option value="STRIPE">Stripe</option>
            <option value="MOCK">Mock</option>
            <option value="MANUAL">Manual</option>
          </select>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm text-foreground">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="highValue" value="true" defaultChecked={params.highValue} className="size-4 rounded border-border" />
              High value
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="fraudOnly" value="true" defaultChecked={params.fraudOnly} className="size-4 rounded border-border" />
              Fraud review only
            </label>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dateFrom" className="shrink-0 text-xs text-muted-foreground">
              Paid from
            </label>
            <input id="dateFrom" type="date" name="dateFrom" defaultValue={params.dateFrom} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="dateTo" className="shrink-0 text-xs text-muted-foreground">
              to
            </label>
            <input id="dateTo" type="date" name="dateTo" defaultValue={params.dateTo} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">
              Apply Filters
            </Button>
            {hasFilters && (
              <Link
                href={hasScopeFilter ? `/admin/payments?${params.designerId ? `designerId=${params.designerId}` : `customerId=${params.customerId}`}` : "/admin/payments"}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Clear Filters
              </Link>
            )}
          </div>
        </div>
      </form>

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments found"
          description={hasFilters ? "No payments match your filters." : "No payments have been made yet."}
          action={
            hasFilters ? (
              <Link href="/admin/payments">
                <Button size="sm" variant="outline">
                  Clear Filters
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[1500px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Designer</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Platform Fee</th>
                  <th className="px-4 py-3 text-right font-medium">Designer Earnings</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Escrow</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/payments/${p.id}`} className="font-mono text-xs font-medium text-foreground hover:underline">
                        {p.id.slice(0, 10)}…
                      </Link>
                      {p.fraud && <Flag className="ml-1.5 inline size-3.5 text-danger" aria-label={p.fraud.reason} />}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <Link href={`/admin/orders/${p.orderId}`} className="text-foreground hover:underline">
                        {p.orderCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.customerProfileId ? (
                        <Link href={`/admin/customers/${p.customerProfileId}`} className="text-foreground hover:underline">
                          {p.customerName}
                        </Link>
                      ) : (
                        <span className="text-foreground">{p.customerName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <Link href={`/admin/businesses/${p.designerId}`} className="text-foreground hover:underline">
                        {p.designerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(p.amount, p.currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.platformFee != null ? formatCurrency(p.platformFee, p.currency) : "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.designerEarnings != null ? formatCurrency(p.designerEarnings, p.currency) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.method.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <Badge className={PAYMENT_STATUS_BADGE[p.status] ?? "bg-muted text-muted-foreground"}>{p.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={ESCROW_STATUS_BADGE[p.escrowStatus]}>{ESCROW_STATUS_LABELS[p.escrowStatus]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/payments/${p.id}`}>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {total} payment{total === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={pageHref(page - 1)}>
                    <Button size="sm" variant="outline">
                      Previous
                    </Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={pageHref(page + 1)}>
                    <Button size="sm" variant="outline">
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
