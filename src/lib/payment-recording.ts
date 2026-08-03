import type { Prisma, Payment, PaymentMethod, PaymentProviderType, FinancialActorType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextReceiptNumber } from "@/lib/invoice-code";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { notifyCustomer } from "@/lib/service-request-notify";
import { syncOrderFinancials } from "@/lib/order-financial-sync";
import { PAYMENT_PROTECTION_STATEMENT } from "@/lib/payment-architecture";

type Db = typeof prisma | Prisma.TransactionClient;

// Called once, immediately, when a hosted checkout link is created — before
// the customer has actually paid. Gives the eventual webhook something
// concrete to find and finalize by providerReference, rather than having to
// infer an invoice from webhook metadata alone.
export async function createPendingPayment(
  db: Db,
  params: {
    businessId: string;
    invoiceId: string;
    amount: number;
    currency: string;
    provider: PaymentProviderType;
    providerReference: string;
    milestoneId?: string | null;
  }
) {
  const invoice = await db.invoice.findUniqueOrThrow({ where: { id: params.invoiceId } });
  return db.payment.create({
    data: {
      businessId: params.businessId,
      invoiceId: params.invoiceId,
      orderId: invoice.orderId,
      customerId: invoice.customerId,
      amount: params.amount,
      currency: params.currency,
      method: "ONLINE",
      provider: params.provider,
      providerReference: params.providerReference,
      idempotencyKey: params.providerReference,
      status: "PENDING",
      milestone: params.milestoneId ? { connect: { id: params.milestoneId } } : undefined,
    },
  });
}

async function applySuccessfulPayment(
  tx: Db,
  payment: Payment,
  params: { actorType: FinancialActorType; actorId?: string | null }
) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: payment.invoiceId } });

  const amountPaid = invoice.amountPaid + payment.amount;
  const balanceDue = Math.max(0, invoice.total - amountPaid);
  const newStatus = balanceDue <= 0.01 ? "PAID" : "PARTIALLY_PAID";

  await tx.invoice.update({ where: { id: invoice.id }, data: { amountPaid, balanceDue, status: newStatus } });

  const milestone = await tx.paymentMilestone.findUnique({ where: { paymentId: payment.id } });
  if (milestone) {
    await tx.paymentMilestone.update({ where: { id: milestone.id }, data: { status: "PAID", paidAt: new Date() } });
  }

  const receiptNumber = await nextReceiptNumber(tx, payment.businessId);
  await tx.receipt.create({ data: { paymentId: payment.id, businessId: payment.businessId, receiptNumber } });

  await syncOrderFinancials(tx, { orderId: invoice.orderId, businessId: payment.businessId, actorId: params.actorId });

  await logFinancialTransaction(tx, {
    businessId: payment.businessId,
    type: "PAYMENT_RECEIVED",
    description: `Payment of ${payment.amount} ${payment.currency} received on ${invoice.invoiceNumber}`,
    orderId: invoice.orderId,
    customerId: invoice.customerId,
    invoiceId: invoice.id,
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    reference: payment.providerReference,
    previousStatus: invoice.status,
    newStatus,
    actorType: params.actorType,
    actorId: params.actorId,
  });
  // Protected-payment audit: no "secured"/"held" language here — the
  // business's own connected gateway settles this payment directly to the
  // business, on the provider's own schedule. Fashion360 never holds it
  // (see lib/payment-architecture.ts). "Platform-mediated" (customerProfileId
  // set) orders get the fuller confirmation copy; legacy staff-recorded
  // orders keep the plain "received" wording since they were never part of
  // the platform-mediated order flow to begin with.
  const order = await tx.order.findUnique({ where: { id: invoice.orderId }, select: { customerProfileId: true, orderCode: true } });
  const isPlatformMediatedOrder = !!order?.customerProfileId;

  await notifyFinancialEvent(tx, {
    businessId: payment.businessId,
    orderId: invoice.orderId,
    title: isPlatformMediatedOrder ? "Payment verified" : "Payment received",
    body: isPlatformMediatedOrder
      ? `${payment.amount} ${payment.currency} verified on ${invoice.invoiceNumber}. Payout eligibility is tracked once the order is fulfilled and confirmed.`
      : `${payment.amount} ${payment.currency} received on ${invoice.invoiceNumber}.`,
    type: "success",
  });

  if (order?.customerProfileId) {
    await notifyCustomer(tx, {
      businessId: payment.businessId,
      customerProfileId: order.customerProfileId,
      title: newStatus === "PAID" ? "Payment confirmed, order confirmed" : "Payment verified",
      body:
        newStatus === "PAID"
          ? `Your payment for order ${order.orderCode} has been verified. ${PAYMENT_PROTECTION_STATEMENT}`
          : `A payment of ${payment.amount} ${payment.currency} for order ${order.orderCode} has been verified.`,
      type: "success",
    });
  }
}

// The single place a *successful, immediate* Payment row is created —
// staff-recorded offline payments (cash/bank transfer/POS/card/other),
// which have no pending intermediate state.
export async function recordPayment(
  tx: Db,
  params: {
    businessId: string;
    invoiceId: string;
    amount: number;
    currency: string;
    method: PaymentMethod;
    provider: PaymentProviderType;
    providerReference?: string | null;
    idempotencyKey: string;
    status: "SUCCESSFUL" | "FAILED";
    milestoneId?: string | null;
    recordedById?: string | null;
    notes?: string | null;
    actorType: FinancialActorType;
    actorId?: string | null;
  }
) {
  const existing = await tx.payment.findUnique({ where: { idempotencyKey: params.idempotencyKey } });
  if (existing) return { payment: existing, alreadyProcessed: true };

  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: params.invoiceId } });

  const payment = await tx.payment.create({
    data: {
      businessId: params.businessId,
      invoiceId: params.invoiceId,
      orderId: invoice.orderId,
      customerId: invoice.customerId,
      amount: params.amount,
      currency: params.currency,
      method: params.method,
      provider: params.provider,
      providerReference: params.providerReference,
      idempotencyKey: params.idempotencyKey,
      status: params.status,
      recordedById: params.recordedById,
      notes: params.notes,
      paidAt: params.status === "SUCCESSFUL" ? new Date() : null,
      milestone: params.milestoneId ? { connect: { id: params.milestoneId } } : undefined,
    },
  });

  if (params.status !== "SUCCESSFUL") {
    await logFinancialTransaction(tx, {
      businessId: params.businessId,
      type: "PAYMENT_FAILED",
      description: `Payment of ${params.amount} ${params.currency} on ${invoice.invoiceNumber} failed`,
      orderId: invoice.orderId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      paymentId: payment.id,
      amount: params.amount,
      currency: params.currency,
      method: params.method,
      reference: params.providerReference,
      actorType: params.actorType,
      actorId: params.actorId,
    });
    return { payment, alreadyProcessed: false };
  }

  await applySuccessfulPayment(tx, payment, { actorType: params.actorType, actorId: params.actorId });
  return { payment, alreadyProcessed: false };
}

// Transitions a PENDING online payment (created by createPendingPayment) to
// its final SUCCESSFUL/FAILED/REVERSED state once the gateway's webhook (or
// a manual status check) reports the outcome. Idempotent: a payment that's
// already left PENDING is left untouched and reported as already-processed
// — implementation rules 13-14.
export async function finalizePendingPayment(
  tx: Db,
  params: {
    businessId: string;
    providerReference: string;
    status: "SUCCESSFUL" | "FAILED" | "REVERSED";
    // Provider-confirmed amount/currency, from an independent call to the
    // provider's own verify API (never from a webhook payload or client
    // callback alone) — see PaymentProvider.verifyPayment. Omitted only by
    // the mock provider's checkout route, which has no independent remote
    // authority to check against (the pending Payment row it looks up *is*
    // the source of truth there). When present and it doesn't match the
    // pending payment's own amount/currency, the payment is marked
    // AMOUNT_MISMATCH and never applied — production must never unlock off
    // an unverified or incorrect amount.
    verifiedAmount?: number | null;
    verifiedCurrency?: string | null;
    actorType: FinancialActorType;
  }
) {
  const payment = await tx.payment.findFirst({
    where: { businessId: params.businessId, providerReference: params.providerReference },
  });
  if (!payment) return { payment: null, alreadyProcessed: false };
  if (payment.status !== "PENDING") return { payment, alreadyProcessed: true };

  if (params.status === "SUCCESSFUL" && params.verifiedAmount != null) {
    const amountMatches = Math.abs(params.verifiedAmount - payment.amount) < 0.01;
    const currencyMatches = !params.verifiedCurrency || params.verifiedCurrency === payment.currency;
    if (!amountMatches || !currencyMatches) {
      const mismatched = await tx.payment.update({ where: { id: payment.id }, data: { status: "AMOUNT_MISMATCH" } });
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: payment.invoiceId } });
      await logFinancialTransaction(tx, {
        businessId: params.businessId,
        type: "PAYMENT_AMOUNT_MISMATCH",
        description: `Provider-verified amount (${params.verifiedAmount} ${params.verifiedCurrency ?? payment.currency}) on ${invoice.invoiceNumber} does not match the expected ${payment.amount} ${payment.currency}, payment blocked, not applied`,
        orderId: invoice.orderId,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        reference: payment.providerReference,
        actorType: params.actorType,
      });
      await notifyFinancialEvent(tx, {
        businessId: params.businessId,
        orderId: invoice.orderId,
        title: "Payment amount mismatch, not applied",
        body: `A payment on ${invoice.invoiceNumber} was verified by the provider at ${params.verifiedAmount} ${params.verifiedCurrency ?? payment.currency}, which does not match the expected ${payment.amount} ${payment.currency}. It has NOT been applied to the invoice and production has NOT been unlocked. Contact support before proceeding.`,
        type: "danger",
      });
      const mismatchOrder = await tx.order.findUnique({ where: { id: invoice.orderId }, select: { customerProfileId: true, orderCode: true } });
      if (mismatchOrder?.customerProfileId) {
        await notifyCustomer(tx, {
          businessId: params.businessId,
          customerProfileId: mismatchOrder.customerProfileId,
          title: "We need to verify your payment",
          body: `We detected a mismatch while verifying your payment for order ${mismatchOrder.orderCode}. It hasn't been applied yet, our team has been notified and will follow up. Please contact support if you don't hear back soon.`,
          type: "warning",
        });
      }
      return { payment: mismatched, alreadyProcessed: false, amountMismatch: true };
    }
  }

  const updated = await tx.payment.update({
    where: { id: payment.id },
    data: { status: params.status, paidAt: params.status === "SUCCESSFUL" ? new Date() : null },
  });

  if (params.status !== "SUCCESSFUL") {
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: payment.invoiceId } });
    await logFinancialTransaction(tx, {
      businessId: params.businessId,
      type: "PAYMENT_FAILED",
      description: `Payment of ${payment.amount} ${payment.currency} on ${invoice.invoiceNumber} ${params.status.toLowerCase()}`,
      orderId: invoice.orderId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      reference: payment.providerReference,
      actorType: params.actorType,
    });
    await notifyFinancialEvent(tx, {
      businessId: params.businessId,
      orderId: invoice.orderId,
      title: params.status === "REVERSED" ? "Payment reversed" : "Payment failed",
      body: `A payment of ${payment.amount} ${payment.currency} on ${invoice.invoiceNumber} ${params.status.toLowerCase()}. Production has not been unlocked.`,
      type: "danger",
    });
    const order = await tx.order.findUnique({ where: { id: invoice.orderId }, select: { customerProfileId: true, orderCode: true } });
    if (order?.customerProfileId) {
      await notifyCustomer(tx, {
        businessId: params.businessId,
        customerProfileId: order.customerProfileId,
        title: params.status === "REVERSED" ? "Your payment was reversed" : "Your payment didn't go through",
        body: `Your payment for order ${order.orderCode} ${params.status.toLowerCase()}. No charge has been applied to your order, please try again or contact the business.`,
        type: "danger",
      });
    }
    return { payment: updated, alreadyProcessed: false };
  }

  await applySuccessfulPayment(tx, updated, { actorType: params.actorType });
  return { payment: updated, alreadyProcessed: false };
}
