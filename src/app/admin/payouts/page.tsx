import { prisma } from "@/lib/prisma";
import { AdminPayoutsClient } from "@/features/admin/components/admin-payouts-client";
import { AdminPayoutRecipientsClient } from "@/features/admin/components/admin-payout-recipients-client";

export default async function AdminPayoutsPage() {
  const [payouts, pendingRecipients] = await Promise.all([
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Businesses with a verified Flutterwave payout account get &quot;Pay via Flutterwave&quot; — a real transfer, not a
          record of one. Everyone else falls back to the honest manual path: an admin marking a real-world transfer already
          made outside the platform, same as offline-settled payments always have.
        </p>
      </div>
      <AdminPayoutRecipientsClient recipients={JSON.parse(JSON.stringify(pendingRecipients))} />
      <AdminPayoutsClient payouts={JSON.parse(JSON.stringify(payoutsWithRecipient))} />
    </div>
  );
}
