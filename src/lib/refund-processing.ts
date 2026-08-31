import type { Prisma, RefundType, RefundStatus, FinancialActorType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { notifyCustomer } from "@/lib/service-request-notify";
import { syncOrderFinancials } from "@/lib/order-financial-sync";
import { resolvePaymentProvider } from "@/lib/payment-providers";
import { PlatformFlutterwaveProvider } from "@/lib/payment-providers/platform-flutterwave-provider";
import { raiseSystemAlert } from "@/lib/admin-system-alerts";

type Db = typeof prisma | Prisma.TransactionClient;

// Shared by the staff "Create Refund" route and dispute resolution (Part
// 23/24) — the same provider-call-then-record sequence, extracted so a
// dispute-driven refund never has to duplicate it.
export async function initiateRefundForPayment(
  db: Db,
  params: { businessId: string; paymentId: string; amount: number; type: RefundType; reason: string; processedById: string }
) {
  const payment = await db.payment.findUniqueOrThrow({ where: { id: params.paymentId } });
  if (payment.businessId !== params.businessId) throw new ApiError(404, "Payment not found");
  if (payment.status !== "SUCCESSFUL") throw new ApiError(400, "Only a successful payment can be refunded");

  const alreadyRefunded = await db.refund.aggregate({ where: { paymentId: payment.id, status: "SUCCESSFUL" }, _sum: { amount: true } });
  const refundedSoFar = alreadyRefunded._sum.amount ?? 0;
  if (params.amount > payment.amount - refundedSoFar + 0.01) {
    throw new ApiError(400, "Refund amount exceeds the amount available to refund on this payment");
  }

  let providerRefundReference: string | null = null;
  let status: RefundStatus = "SUCCESSFUL";

  // "chg_"-prefixed references are Fashion360's own platform Flutterwave
  // charges (see lib/payment-link.ts) — refunded straight through the
  // platform account, no PaymentGatewayConnection involved. Anything else
  // is a payment from the legacy per-business-gateway flow.
  // Neither branch below is wrapped in a DB transaction — same reasoning
  // as every other place in this codebase that calls a real payment
  // provider (see lib/payout.ts's comment on executePayoutTransfer): the
  // HTTP call must never sit inside an open transaction. A failure here
  // means processRefund below is never reached, so nothing is recorded as
  // refunded — the caller's own error response is the immediate signal,
  // but raiseSystemAlert also surfaces it platform-wide since this
  // function is shared with dispute resolution, where a refund can fail
  // with no admin actively watching in real time.
  try {
    if (payment.provider === "FLUTTERWAVE" && payment.providerReference?.startsWith("chg_")) {
      const result = await new PlatformFlutterwaveProvider().initiateRefund({
        providerReference: payment.providerReference,
        amount: params.amount,
        currency: payment.currency,
      });
      status = result.status;
      providerRefundReference = result.providerRefundReference;
    } else if (payment.provider !== "MANUAL" && payment.providerReference) {
      const connection = await db.paymentGatewayConnection.findUnique({ where: { businessId_provider: { businessId: params.businessId, provider: payment.provider } } });
      if (!connection) throw new ApiError(400, "The original payment gateway is no longer connected, process this refund manually");
      const result = await resolvePaymentProvider(connection).initiateRefund({ providerReference: payment.providerReference, amount: params.amount, currency: payment.currency });
      status = result.status;
      providerRefundReference = result.providerRefundReference;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      await raiseSystemAlert(db, {
        category: "API_FAILURE",
        severity: "CRITICAL",
        title: "Refund request to payment provider failed",
        message: `Refunding payment ${payment.id} (${params.amount} ${payment.currency}) failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        context: { paymentId: payment.id, businessId: params.businessId, amount: params.amount },
      });
    }
    throw error;
  }

  return processRefund(db, {
    businessId: params.businessId,
    paymentId: payment.id,
    amount: params.amount,
    type: params.type,
    reason: params.reason,
    status,
    providerRefundReference,
    processedById: params.processedById,
    actorType: "STAFF",
  });
}

export async function processRefund(
  tx: Db,
  params: {
    businessId: string;
    paymentId: string;
    amount: number;
    type: RefundType;
    reason: string;
    status: RefundStatus;
    providerRefundReference?: string | null;
    processedById?: string | null;
    actorType: FinancialActorType;
  }
) {
  const payment = await tx.payment.findUniqueOrThrow({ where: { id: params.paymentId }, include: { invoice: true } });

  const refund = await tx.refund.create({
    data: {
      businessId: params.businessId,
      paymentId: params.paymentId,
      amount: params.amount,
      type: params.type,
      reason: params.reason,
      status: params.status,
      providerRefundReference: params.providerRefundReference,
      processedById: params.processedById,
      processedAt: params.status === "SUCCESSFUL" ? new Date() : null,
    },
  });

  await logFinancialTransaction(tx, {
    businessId: params.businessId,
    type: "REFUND_CREATED",
    description: `Refund of ${params.amount} ${payment.currency} requested for ${payment.invoice.invoiceNumber}`,
    orderId: payment.orderId,
    customerId: payment.customerId,
    invoiceId: payment.invoiceId,
    paymentId: payment.id,
    refundId: refund.id,
    amount: params.amount,
    currency: payment.currency,
    method: payment.method,
    reference: params.providerRefundReference,
    newStatus: params.status,
    actorType: params.actorType,
    actorId: params.processedById,
  });

  const order = await tx.order.findUnique({ where: { id: payment.orderId }, select: { customerProfileId: true, orderCode: true } });
  if (order?.customerProfileId) {
    await notifyCustomer(tx, {
      businessId: params.businessId,
      customerProfileId: order.customerProfileId,
      title: "Refund initiated",
      body: `A refund of ${params.amount} ${payment.currency} has been initiated for order ${order.orderCode}.`,
      type: "info",
    });
  }

  if (params.status !== "SUCCESSFUL") return refund;

  const invoice = payment.invoice;
  const amountPaid = Math.max(0, invoice.amountPaid - params.amount);
  const isFullRefund = params.type === "FULL" || amountPaid <= 0.01;

  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid,
      balanceDue: Math.max(0, invoice.total - amountPaid),
      status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
    },
  });

  await syncOrderFinancials(tx, { orderId: payment.orderId, businessId: params.businessId, actorId: params.processedById });

  await logFinancialTransaction(tx, {
    businessId: params.businessId,
    type: "REFUND_PROCESSED",
    description: `Refund of ${params.amount} ${payment.currency} processed for ${invoice.invoiceNumber}`,
    orderId: payment.orderId,
    customerId: payment.customerId,
    invoiceId: payment.invoiceId,
    paymentId: payment.id,
    refundId: refund.id,
    amount: params.amount,
    currency: payment.currency,
    actorType: params.actorType,
    actorId: params.processedById,
  });
  await notifyFinancialEvent(tx, {
    businessId: params.businessId,
    orderId: payment.orderId,
    title: "Refund processed",
    body: `${params.amount} ${payment.currency} refunded on ${invoice.invoiceNumber}.`,
    type: "warning",
    event: "REFUND_APPROVED",
  });
  if (order?.customerProfileId) {
    await notifyCustomer(tx, {
      businessId: params.businessId,
      customerProfileId: order.customerProfileId,
      title: "Refund completed",
      body: `Your refund of ${params.amount} ${payment.currency} for order ${order.orderCode} has been completed.`,
      type: "success",
      event: "REFUND_APPROVED",
    });
  }

  return refund;
}
