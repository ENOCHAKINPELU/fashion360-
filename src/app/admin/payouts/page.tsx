import { prisma } from "@/lib/prisma";
import { AdminPayoutsClient } from "@/features/admin/components/admin-payouts-client";
import { AdminPayoutRecipientsClient } from "@/features/admin/components/admin-payout-recipients-client";

export default async function AdminPayoutsPage() {
  const [payouts, pendingRecipients] = await Promise.all([
    prisma.payout.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { business: { select: { name: true } }, order: { select: { orderCode: true } } },
    }),
    prisma.payoutRecipient.findMany({
      where: { kycStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { business: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payouts</h1>
        <p className="text-sm text-muted-foreground">
          No live payout-gateway integration is configured for any provider in this environment, marking a payout &quot;Paid&quot;
          here is an authorized admin recording a real-world transfer already made outside the platform, the same honest
          manual-record-keeping pattern used for offline-settled payments.
        </p>
      </div>
      <AdminPayoutRecipientsClient recipients={JSON.parse(JSON.stringify(pendingRecipients))} />
      <AdminPayoutsClient payouts={JSON.parse(JSON.stringify(payouts))} />
    </div>
  );
}
