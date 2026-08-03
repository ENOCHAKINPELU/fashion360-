import { prisma } from "@/lib/prisma";
import { getOrCreatePlatformSettings } from "@/lib/platform-settings";
import { Logo } from "@/shared/components/logo";
import { PAYMENT_PROTECTION_STATEMENT } from "@/lib/payment-architecture";

export default async function PaymentPolicyPage() {
  const settings = await getOrCreatePlatformSettings(prisma);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Payment, Cancellation, Refund & Dispute Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">{PAYMENT_PROTECTION_STATEMENT}</p>

      <section id="cancellation" className="mt-8 space-y-2 scroll-mt-16">
        <h2 className="text-lg font-semibold text-foreground">Cancellation Policy</h2>
        <p className="text-sm text-muted-foreground">
          If your order hasn&apos;t been paid for yet, cancelling is always free. Once paid, the refund you receive on
          cancellation depends on how far your order has progressed:
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>Before production has started: {settings.cancellationRefundBeforeProductionPercent}% refund</li>
          <li>During production: {settings.cancellationRefundDuringProductionPercent}% refund</li>
          <li>After production is complete (awaiting delivery): {settings.cancellationRefundAfterProductionPercent}% refund</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Once your order has been delivered, cancellation is no longer available, use &quot;Report a Problem&quot; on your
          order instead, which opens a dispute.
        </p>
      </section>

      <section id="refund" className="mt-8 space-y-2 scroll-mt-16">
        <h2 className="text-lg font-semibold text-foreground">Refund Policy</h2>
        <p className="text-sm text-muted-foreground">
          Refunds are issued back through the same payment provider you paid with, and are verified directly with the
          provider before being marked complete, never assumed successful from a client-side confirmation. Refunds can
          result from an order cancellation (see above) or from an approved dispute resolution.
        </p>
      </section>

      <section id="dispute" className="mt-8 space-y-2 scroll-mt-16">
        <h2 className="text-lg font-semibold text-foreground">Dispute Policy</h2>
        <p className="text-sm text-muted-foreground">
          Once your order is marked delivered, you have {settings.disputeWindowDays} day{settings.disputeWindowDays === 1 ? "" : "s"} to
          confirm receipt or report a problem. Reporting a problem opens a dispute and blocks the business&apos;s payout for
          that order until it&apos;s resolved. If you take no action within the window, your order is treated as confirmed.
        </p>
      </section>
    </div>
  );
}
