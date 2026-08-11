import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { PlatformFlutterwaveProvider } from "@/lib/payment-providers/platform-flutterwave-provider";
import { isFlutterwaveConfigured } from "@/lib/flutterwave";
import { createPendingPayment, finalizePendingPayment } from "@/lib/payment-recording";

type Db = typeof prisma | Prisma.TransactionClient;

// Shared by the staff "Create Payment Link" action and every customer-facing
// pay entrypoint (the order "Pay Now" button, the shared invoice-pay page)
// — all of them need the exact same steps: ask Fashion360's own platform
// Flutterwave account for a hosted checkout link, and record a PENDING
// Payment placeholder so the eventual webhook (or the active poll in
// pollFlutterwaveChargeStatus below) has something to reconcile against.
//
// A business is never asked for a payment gateway of its own — Fashion360
// collects the full payment into its own Flutterwave balance, then later
// moves the business's share out via lib/payout.ts once the order is
// payout-eligible. See lib/payment-architecture.ts for the full picture.
export async function createInvoicePaymentLink(
  db: Db,
  params: { businessId: string; invoiceId: string; callbackUrl: string; milestoneId?: string | null }
) {
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: params.invoiceId },
    include: { customer: { select: { email: true } } },
  });
  if (invoice.balanceDue <= 0) throw new ApiError(400, "This invoice has no outstanding balance");
  if (!isFlutterwaveConfigured()) throw new ApiError(503, "Online payment isn't available right now. Please contact the business to arrange payment.");
  // Flutterwave's "bank_account" charge type (see flutterwave.ts) is
  // NGN-only, same constraint already accepted on the payout side.
  if (invoice.currency !== "NGN") {
    throw new ApiError(400, "Online payment is only available for NGN invoices right now. Please contact the business to arrange payment.");
  }

  const amount = params.milestoneId
    ? (await db.paymentMilestone.findUniqueOrThrow({ where: { id: params.milestoneId } })).amount
    : invoice.balanceDue;

  const provider = new PlatformFlutterwaveProvider();
  // Alphanumeric only, 6-42 characters — both confirmed empirically against
  // Flutterwave v4's own validation, which rejects "-"/"_" and anything
  // outside that length range. A prefixed invoice number
  // ("INV20260001" + a 32-char UUID = 43 chars) blew past the ceiling on
  // every single invoice, which is why every payment attempt was failing —
  // dropping the invoice-number prefix and keeping just the UUID (36 chars
  // incl. the "f360" tag) fixes it while keeping full UUID entropy for
  // uniqueness — this also becomes Payment.idempotencyKey, so it still
  // needs to be globally unique, not just unique per invoice.
  const reference = `f360${randomUUID().replace(/-/g, "")}`;

  // Wrapped so a Flutterwave-side rejection (bad reference, provider
  // outage, ...) surfaces as a clear 502 message instead of falling through
  // apiErrorResponse's generic "Internal server error" — the same class of
  // opaque failure fixed platform-wide for Zod errors in rbac.ts, applied
  // here too since this throw is a plain Error, not an ApiError.
  let result: Awaited<ReturnType<typeof provider.initializePayment>>;
  try {
    result = await provider.initializePayment({
      amount,
      currency: invoice.currency,
      email: invoice.customer.email ?? "customer@fashion360.app",
      reference,
      callbackUrl: params.callbackUrl,
      metadata: { invoiceId: invoice.id, businessId: params.businessId, milestoneId: params.milestoneId ?? undefined },
    });
  } catch (error) {
    throw new ApiError(502, error instanceof Error ? `Could not start payment: ${error.message}` : "Could not start payment right now, please try again shortly.");
  }

  // result.providerReference is the Flutterwave charge id (chg_...), not
  // the `reference` we just generated — see platform-flutterwave-provider.ts.
  await createPendingPayment(db, {
    businessId: params.businessId,
    invoiceId: invoice.id,
    amount,
    currency: invoice.currency,
    provider: "FLUTTERWAVE",
    providerReference: result.providerReference,
    milestoneId: params.milestoneId,
  });

  return { authorizationUrl: result.authorizationUrl, providerReference: result.providerReference, provider: "FLUTTERWAVE" as const };
}

// Actively checks Flutterwave for any still-PENDING platform charge on this
// invoice and finalizes it if Flutterwave now reports it succeeded or
// failed — called from the customer-facing GET routes that back the "Pay
// Now" polling UI. The platform webhook (see
// app/api/payments/webhook/flutterwave-platform/route.ts) is the durable
// path that works even when nobody's looking at the page; this is the
// belt-and-suspenders path that makes the polling UI actually converge
// today, before the user has necessarily finished pasting the webhook URL
// and secret into their Flutterwave dashboard (that step can only be done
// there, not via API — see the FLUTTERWAVE_WEBHOOK_SECRET setup notes).
// Best-effort: swallows errors, since a failed poll should never break the
// page load that triggered it — the webhook or the next poll can catch up.
export async function pollFlutterwaveChargeStatus(db: typeof prisma, params: { invoiceId: string }) {
  const pending = await db.payment.findFirst({
    where: { invoiceId: params.invoiceId, status: "PENDING", provider: "FLUTTERWAVE" },
  });
  if (!pending?.providerReference?.startsWith("chg_")) return;

  try {
    const provider = new PlatformFlutterwaveProvider();
    const verified = await provider.verifyPayment(pending.providerReference);
    if (verified.status === "PENDING") return;
    const finalStatus: "SUCCESSFUL" | "FAILED" = verified.status === "SUCCESSFUL" ? "SUCCESSFUL" : "FAILED";

    await db.$transaction((tx) =>
      finalizePendingPayment(tx, {
        businessId: pending.businessId,
        providerReference: pending.providerReference!,
        status: finalStatus,
        verifiedAmount: verified.amount,
        verifiedCurrency: verified.currency,
        actorType: "SYSTEM",
      })
    );
  } catch {
    // Flutterwave unreachable or errored — leave PENDING, next poll or the
    // webhook will retry.
  }
}
