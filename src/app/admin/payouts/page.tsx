import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPayoutsClient } from "@/features/admin/components/admin-payouts-client";
import { AdminPayoutRecipientsClient } from "@/features/admin/components/admin-payout-recipients-client";
import { PAYMENT_ARCHITECTURE_SUMMARY } from "@/lib/payment-architecture";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent>
        <p className="text-xs text-muted-foreground uppercase">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
}

// The "Payments" nav item's landing page — this used to be its own
// separate content living at /admin (the platform-wide payment/refund/
// dispute/payout overview built for Phase 8), moved here so /admin can
// become the real Overview/Needs Attention/Recent Activity dashboard the
// Admin Phase 1 brief asks for, and "Payments" has one clear home instead
// of the numbers living somewhere unrelated to the payout actions below
// them.
export default async function AdminPayoutsPage() {
  const [
    successfulAgg,
    failedCount,
    amountMismatchCount,
    refundsAgg,
    disputesOpenCount,
    payoutsEligibleAgg,
    payoutsPaidAgg,
    platformFeeAgg,
    payouts,
    pendingRecipients,
  ] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true }, _count: true }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.payment.count({ where: { status: "AMOUNT_MISMATCH" } }),
    prisma.refund.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true }, _count: true }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.payout.aggregate({ where: { status: "ELIGIBLE" }, _sum: { netAmount: true }, _count: true }),
    prisma.payout.aggregate({ where: { status: "PAID" }, _sum: { netAmount: true }, _count: true }),
    prisma.payout.aggregate({ where: { status: "PAID" }, _sum: { platformFee: true } }),
    prisma.payout.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        business: { select: { name: true } },
        order: { select: { orderCode: true } },
      },
    }),
    prisma.payoutRecipient.findMany({
      where: { kycStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { business: { select: { id: true, name: true } } },
    }),
  ]);

  // One extra query rather than a relation join — Payout has no direct
  // relation to PayoutRecipient (it's keyed by businessId, not payoutId).
  const recipientsByBusiness = await prisma.payoutRecipient.findMany({
    where: { businessId: { in: [...new Set(payouts.map((p) => p.businessId))] } },
    select: { businessId: true, kycStatus: true, providerRecipientCode: true },
  });
  const recipientMap = new Map(recipientsByBusiness.map((r) => [r.businessId, r]));
  const payoutsWithRecipient = payouts.map((p) => ({ ...p, canPayViaFlutterwave: recipientMap.get(p.businessId)?.kycStatus === "VERIFIED" && !!recipientMap.get(p.businessId)?.providerRecipientCode }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground">Platform-wide payment, refund, dispute, and payout activity across every business.</p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Payment Volume" value={fmt(successfulAgg._sum.amount ?? 0)} hint={`${successfulAgg._count} successful payments`} />
          <StatCard label="Failed Payments" value={String(failedCount)} hint={amountMismatchCount > 0 ? `${amountMismatchCount} amount mismatch, blocked` : undefined} />
          <StatCard label="Refunds Processed" value={fmt(refundsAgg._sum.amount ?? 0)} hint={`${refundsAgg._count} refunds`} />
          <StatCard label="Open Disputes" value={String(disputesOpenCount)} />
          <StatCard label="Pending Payouts" value={fmt(payoutsEligibleAgg._sum.netAmount ?? 0)} hint={`${payoutsEligibleAgg._count} eligible`} />
          <StatCard label="Payouts Completed" value={fmt(payoutsPaidAgg._sum.netAmount ?? 0)} hint={`${payoutsPaidAgg._count} paid`} />
          <StatCard label="Platform Revenue" value={fmt(platformFeeAgg._sum.platformFee ?? 0)} hint="Fees earned on completed payouts" />
        </div>

        <Card className="mt-4 border-none shadow-sm">
          <CardContent className="space-y-2">
            <p className="text-sm font-medium text-foreground">Where the money sits</p>
            <p className="text-xs text-muted-foreground">
              {PAYMENT_ARCHITECTURE_SUMMARY.fashion360HoldsFunds
                ? "Fashion360 collects customer payments into its own platform Flutterwave balance and holds them there."
                : "Businesses collect payments directly through their own connected gateway."}{" "}
              Funds are released to a {PAYMENT_ARCHITECTURE_SUMMARY.settlementDestination}, {PAYMENT_ARCHITECTURE_SUMMARY.settlementTiming}.
              &quot;Pending Payouts&quot; above are real money Fashion360 is currently holding and has not yet transferred out.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Payouts</h2>
          <p className="text-sm text-muted-foreground">
            Businesses with a verified Flutterwave payout account get &quot;Pay via Flutterwave&quot; — a real transfer, not a
            record of one. Everyone else falls back to the honest manual path: an admin marking a real-world transfer already
            made outside the platform, same as offline-settled payments always have.
          </p>
        </div>
        <AdminPayoutRecipientsClient recipients={JSON.parse(JSON.stringify(pendingRecipients))} />
        <AdminPayoutsClient payouts={JSON.parse(JSON.stringify(payoutsWithRecipient))} />
      </section>
    </div>
  );
}
