import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { PAYMENT_ARCHITECTURE_SUMMARY } from "@/lib/payment-architecture";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent>
        <p className="text-xs text-muted-foreground uppercase">{label}</p>
        <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
}

export default async function AdminOverviewPage() {
  const [
    successfulAgg,
    failedCount,
    amountMismatchCount,
    refundsAgg,
    disputesOpenCount,
    payoutsEligibleAgg,
    payoutsPaidAgg,
    platformFeeAgg,
  ] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true }, _count: true }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.payment.count({ where: { status: "AMOUNT_MISMATCH" } }),
    prisma.refund.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true }, _count: true }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.payout.aggregate({ where: { status: "ELIGIBLE" }, _sum: { netAmount: true }, _count: true }),
    prisma.payout.aggregate({ where: { status: "PAID" }, _sum: { netAmount: true }, _count: true }),
    prisma.payout.aggregate({ where: { status: "PAID" }, _sum: { platformFee: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Transaction Overview</h1>
        <p className="text-sm text-muted-foreground">Platform-wide payment, refund, dispute, and payout activity across every business.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Payment Volume" value={fmt(successfulAgg._sum.amount ?? 0)} hint={`${successfulAgg._count} successful payments`} />
        <StatCard label="Failed Payments" value={String(failedCount)} hint={amountMismatchCount > 0 ? `${amountMismatchCount} amount mismatch, blocked` : undefined} />
        <StatCard label="Refunds Processed" value={fmt(refundsAgg._sum.amount ?? 0)} hint={`${refundsAgg._count} refunds`} />
        <StatCard label="Open Disputes" value={String(disputesOpenCount)} />
        <StatCard label="Pending Payouts" value={fmt(payoutsEligibleAgg._sum.netAmount ?? 0)} hint={`${payoutsEligibleAgg._count} eligible`} />
        <StatCard label="Payouts Completed" value={fmt(payoutsPaidAgg._sum.netAmount ?? 0)} hint={`${payoutsPaidAgg._count} paid`} />
        <StatCard label="Platform Revenue" value={fmt(platformFeeAgg._sum.platformFee ?? 0)} hint="Fees earned on completed payouts" />
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-2">
          <p className="text-sm font-medium text-foreground">Provider Settlement Information</p>
          <p className="text-xs text-muted-foreground">
            Every business connects and settles through its own payment provider account, Fashion360 does not hold funds
            {" "}({PAYMENT_ARCHITECTURE_SUMMARY.settlementDestination}, {PAYMENT_ARCHITECTURE_SUMMARY.settlementTiming}). &quot;Payouts&quot;
            above track this platform&apos;s payout-eligibility bookkeeping, not a Fashion360-held balance. See the Payouts tab for details on what &quot;Paid&quot; means today.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
