import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PayoutsPageClient } from "@/features/payouts/components/payouts-page-client";
import { PayoutAccountSettings } from "@/features/payouts/components/payout-account-settings";

export default async function PayoutsPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const [business, payouts, recipient] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { currency: true } }),
    prisma.payout.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      include: { order: { select: { id: true, orderCode: true, customer: { select: { firstName: true, lastName: true } } } } },
    }),
    prisma.payoutRecipient.findUnique({ where: { businessId } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payouts</h1>
        <p className="text-sm text-muted-foreground">Fashion360 collects customer payments and transfers your share to the bank account below once an order is paid, produced, delivered, and either confirmed by the customer or its dispute window has expired.</p>
      </div>
      <PayoutAccountSettings recipient={recipient} />
      <PayoutsPageClient payouts={JSON.parse(JSON.stringify(payouts))} currency={business.currency} />
    </div>
  );
}
