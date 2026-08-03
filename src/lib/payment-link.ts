import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { resolvePaymentProvider } from "@/lib/payment-providers";
import { createPendingPayment } from "@/lib/payment-recording";

type Db = typeof prisma | Prisma.TransactionClient;

// Shared by the staff "Create Payment Link" action and the customer-facing
// invoice-pay page — both need the exact same steps: resolve the business's
// connected gateway, ask it for a hosted checkout URL, and record a PENDING
// Payment placeholder so the eventual webhook has something to reconcile
// against. Fashion360 never touches the money itself (section 19) — this
// only ever calls out to the business's own gateway credentials.
export async function createInvoicePaymentLink(
  db: Db,
  params: { businessId: string; invoiceId: string; callbackUrl: string; milestoneId?: string | null }
) {
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: params.invoiceId },
    include: { customer: { select: { email: true } } },
  });
  if (invoice.balanceDue <= 0) throw new ApiError(400, "This invoice has no outstanding balance");

  const connection = await db.paymentGatewayConnection.findFirst({
    where: { businessId: params.businessId, isActive: true, status: "CONNECTED" },
  });
  if (!connection) throw new ApiError(400, "No payment gateway is connected for this business yet");

  const amount = params.milestoneId
    ? (await db.paymentMilestone.findUniqueOrThrow({ where: { id: params.milestoneId } })).amount
    : invoice.balanceDue;

  const provider = resolvePaymentProvider(connection);
  const reference = `${invoice.invoiceNumber}_${randomUUID()}`.replace(/\s+/g, "-");

  const result = await provider.initializePayment({
    amount,
    currency: invoice.currency,
    email: invoice.customer.email ?? "customer@fashion360.app",
    reference,
    callbackUrl: params.callbackUrl,
    metadata: { invoiceId: invoice.id, businessId: params.businessId, milestoneId: params.milestoneId ?? undefined },
  });

  await createPendingPayment(db, {
    businessId: params.businessId,
    invoiceId: invoice.id,
    amount,
    currency: invoice.currency,
    provider: connection.provider,
    providerReference: result.providerReference,
    milestoneId: params.milestoneId,
  });

  return { authorizationUrl: result.authorizationUrl, providerReference: result.providerReference, provider: connection.provider };
}
