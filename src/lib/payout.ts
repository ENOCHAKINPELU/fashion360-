import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logOrderActivity } from "@/lib/order-activity";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { markOrderTimelineStage } from "@/lib/order-timeline";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { notifyCustomer } from "@/lib/service-request-notify";
import { getOrCreatePlatformSettings } from "@/lib/platform-settings";
import { recordGarmentDelivered } from "@/lib/fashion-milestones";
import { logCustomerBehavior } from "@/lib/customer-behavior";
import { createTransfer, getTransferStatus } from "@/lib/flutterwave";
import { raiseSystemAlert } from "@/lib/admin-system-alerts";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 34: the four conditions, checked together, every time — never a
// single client action. Returns why it isn't eligible so callers (and staff
// debugging a "why hasn't this paid out" question) can see exactly what's
// still missing.
export async function evaluatePayoutEligibility(db: Db, params: { orderId: string }) {
  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId } });
  const delivery = await db.delivery.findUnique({ where: { orderId: params.orderId } });
  const activeDispute = await db.dispute.findFirst({ where: { orderId: params.orderId, status: { in: ["OPEN", "UNDER_REVIEW"] } } });

  const paymentVerified = order.paymentStatus === "PAID";
  const delivered = delivery?.status === "DELIVERED";
  const confirmed = !!delivery?.customerConfirmedAt;
  const windowExpired = !!delivery?.confirmationDeadline && delivery.confirmationDeadline.getTime() < Date.now();
  const noActiveDispute = !activeDispute;

  const eligible = paymentVerified && delivered && (confirmed || windowExpired) && noActiveDispute;

  return { eligible, paymentVerified, delivered, confirmed, windowExpired, noActiveDispute, order, delivery };
}

// Part 20/25/26: idempotent — calling this twice for the same order just
// returns the existing Payout. Computes the net payout from the platform's
// (not the business's) fee settings, so a business can never see or set its
// own commission rate.
export async function makePayoutEligible(db: Db, params: { orderId: string; businessId: string; actorId?: string | null }) {
  const existing = await db.payout.findUnique({ where: { orderId: params.orderId } });
  if (existing) return existing;

  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId } });
  if (order.businessId !== params.businessId) throw new ApiError(404, "Order not found");

  const [payment, settings, delivery] = await Promise.all([
    db.payment.findFirst({ where: { orderId: params.orderId, status: "SUCCESSFUL" }, orderBy: { paidAt: "desc" } }),
    getOrCreatePlatformSettings(db),
    db.delivery.findUnique({ where: { orderId: params.orderId } }),
  ]);

  const refunds = await db.refund.findMany({
    where: { status: "SUCCESSFUL", payment: { orderId: params.orderId } },
  });
  const refundedAmount = refunds.reduce((sum, r) => sum + r.amount, 0);

  const platformFee = Math.round(order.totalValue * (settings.platformFeePercentage / 100) * 100) / 100;
  const deliveryFee = delivery?.deliveryCost ?? 0;
  const netAmount = Math.max(0, order.totalValue - platformFee - deliveryFee - refundedAmount);

  const payout = await db.payout.create({
    data: {
      orderId: params.orderId,
      businessId: params.businessId,
      paymentId: payment?.id,
      orderAmount: order.totalValue,
      platformFee,
      deliveryFee,
      otherDeductions: 0,
      refundedAmount,
      netAmount,
      status: "ELIGIBLE",
    },
  });

  await db.payoutStatusHistory.create({
    data: { payoutId: payout.id, businessId: params.businessId, previousStatus: null, newStatus: "ELIGIBLE", actorId: params.actorId },
  });

  await db.order.update({ where: { id: params.orderId }, data: { status: "COMPLETED" } });
  await logOrderActivity(db, { orderId: params.orderId, businessId: params.businessId, type: "PAYOUT_ELIGIBLE", title: "Order completed, payout eligible", actorId: params.actorId });

  // Phase 10 repair: the moment an order is genuinely, trustworthily
  // complete (delivered + confirmed, never a client-side-only event) is
  // also the moment the garment enters the customer's digital wardrobe.
  if (order.customerProfileId) {
    const item = await db.orderItem.findFirst({ where: { orderId: params.orderId }, orderBy: { sortOrder: "asc" }, include: { customization: true } });
    await recordGarmentDelivered(db, {
      customerProfileId: order.customerProfileId,
      businessId: params.businessId,
      orderCode: order.orderCode,
      garmentName: item?.designNameSnapshot ?? order.orderCode,
      imageUrl: item?.designImageSnapshot,
      category: item?.designCategorySnapshot,
      color: item?.customization?.primaryColor,
      fabric: item?.customization?.fabricNameSnapshot,
    });
    await logCustomerBehavior(db, { customerProfileId: order.customerProfileId, businessId: params.businessId, type: "ORDER_COMPLETED", targetType: "ORDER", targetId: params.orderId });
  }
  await logFinancialTransaction(db, {
    businessId: params.businessId,
    type: "PAYOUT_ELIGIBLE",
    description: `Payout of ${netAmount} eligible for order ${order.orderCode}`,
    orderId: params.orderId,
    amount: netAmount,
    actorType: params.actorId ? "STAFF" : "SYSTEM",
    actorId: params.actorId,
  });
  await notifyFinancialEvent(db, {
    businessId: params.businessId,
    orderId: params.orderId,
    assignedDesignerId: order.assignedDesignerId,
    title: "Payout eligible",
    body: `${order.orderCode} is complete, your payout of ${netAmount} is now eligible for processing.`,
    type: "success",
    event: "ESCROW_CREATED",
  });

  return payout;
}

// Part 18/19: the customer's own "Confirm Receipt" action. Returns the
// payout's id (if this confirmation made one eligible) so the route calling
// this — always inside a $transaction, since this function itself writes
// several rows — can attempt automatic release *after* that transaction
// commits. See attemptAutomaticPayoutRelease below for why that ordering
// isn't optional: firing the real Flutterwave transfer from inside this
// function's own open transaction would mean checking for the payout on a
// connection that can't see it yet.
export async function confirmCustomerDelivery(db: Db, params: { orderId: string; customerProfileId: string }) {
  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId } });
  if (order.customerProfileId !== params.customerProfileId) throw new ApiError(404, "Order not found");

  const delivery = await db.delivery.findUnique({ where: { orderId: params.orderId } });
  if (!delivery || delivery.status !== "DELIVERED") throw new ApiError(400, "This order hasn't been marked delivered yet");
  if (delivery.customerConfirmedAt) throw new ApiError(400, "You've already confirmed this delivery");

  const updated = await db.delivery.update({ where: { orderId: params.orderId }, data: { customerConfirmedAt: new Date() } });
  await markOrderTimelineStage(db, { orderId: params.orderId, businessId: order.businessId, stage: "CUSTOMER_CONFIRMED", status: "COMPLETED" });
  await logOrderActivity(db, { orderId: params.orderId, businessId: order.businessId, type: "CUSTOMER_CONFIRMED_RECEIPT", title: "Customer confirmed receipt" });
  await notifyFinancialEvent(db, {
    businessId: order.businessId,
    orderId: params.orderId,
    assignedDesignerId: order.assignedDesignerId,
    title: "Customer confirmed receipt",
    body: `${order.orderCode}'s customer confirmed they received their order.`,
    type: "success",
  });

  const { eligible } = await evaluatePayoutEligibility(db, { orderId: params.orderId });
  let payoutId: string | null = null;
  if (eligible) {
    const payout = await makePayoutEligible(db, { orderId: params.orderId, businessId: order.businessId, actorId: null });
    payoutId = payout.id;
  }

  return { delivery: updated, payoutId };
}

// Part 21: called lazily whenever an order/delivery is read (no cron
// infrastructure to schedule a sweep on) — if the dispute window has quietly
// expired with no customer response and no dispute, the payout becomes
// eligible exactly as if the customer had confirmed. Deliberately typed to
// the plain client, not the transaction-capable Db union: both real callers
// already pass `prisma` directly (never wrapped in $transaction), and this
// function now attempts a real Flutterwave transfer as part of the same
// call — see attemptAutomaticPayoutRelease's own comment on why that must
// never run inside an open transaction.
export async function releaseIfWindowExpired(db: typeof prisma, params: { orderId: string }) {
  const { eligible, delivered, confirmed, windowExpired, order } = await evaluatePayoutEligibility(db, { orderId: params.orderId });
  if (eligible && delivered && !confirmed && windowExpired) {
    const payout = await makePayoutEligible(db, { orderId: params.orderId, businessId: order.businessId, actorId: null });
    await attemptAutomaticPayoutRelease(db, { payoutId: payout.id });
  }
}

// ===================== Automatic release (Admin Phase 7 follow-up) =====
//
// Product decision, confirmed explicitly rather than assumed: automatic
// release keeps today's real eligibility gate exactly as-is (delivered +
// (customer confirmed OR the dispute window expired) + no open dispute —
// evaluatePayoutEligibility, unchanged above). What changes is only what
// happens the instant a payout reaches ELIGIBLE: a clean case fires the
// transfer immediately instead of waiting for an admin to click Approve.
// A payout that fails the risk check, or has no verified payout account to
// send money to, simply stays ELIGIBLE — exactly the same queue
// /admin/payments already shows an admin, with the reason now recorded on
// the payout's own status history. This does not change the customer-
// facing payment-protection promise in lib/payment-architecture.ts at all
// (same gate, same money-holding period); it only removes the manual
// checkpoint the architecture doc previously called out as a limitation
// ("admin-triggered... no automatic transfer trigger yet").

const AUTO_RELEASE_MULTIPLE_FAILED_ATTEMPTS_THRESHOLD = 3; // mirrors lib/admin-payments.ts's own MULTIPLE_FAILED_ATTEMPTS_THRESHOLD — kept as a local copy per this codebase's established convention (a small local copy per file rather than a shared export) since the two run against genuinely different data shapes: a bulk dashboard scan there vs. one payout's own order here.

interface AutoReleaseRiskResult {
  passed: boolean;
  reasons: string[];
}

// The single-record counterpart of lib/admin-payments.ts's bulk
// resolveFraudSignals — same four checks that apply before a payout even
// exists (duplicate payment, repeated failed attempts, chargeback/
// reversal, manually flagged), computed here at eligibility time rather
// than re-run from the bulk dashboard resolver. "Repeated payout failures"
// doesn't apply yet at this point — there's no payout attempt history
// until one exists.
async function runAutomaticReleaseRiskCheck(db: typeof prisma, params: { orderId: string; paymentId: string | null }): Promise<AutoReleaseRiskResult> {
  const reasons: string[] = [];

  const [successfulCount, failedCount] = await Promise.all([
    db.payment.count({ where: { orderId: params.orderId, status: "SUCCESSFUL" } }),
    db.payment.count({ where: { orderId: params.orderId, status: "FAILED" } }),
  ]);
  if (successfulCount >= 2) reasons.push("Duplicate payment — more than one successful charge on this order");
  if (failedCount >= AUTO_RELEASE_MULTIPLE_FAILED_ATTEMPTS_THRESHOLD) reasons.push(`${AUTO_RELEASE_MULTIPLE_FAILED_ATTEMPTS_THRESHOLD}+ failed payment attempts on this order`);

  if (params.paymentId) {
    const [payment, latestFraudFlag] = await Promise.all([
      db.payment.findUnique({ where: { id: params.paymentId }, select: { status: true } }),
      db.auditLog.findFirst({
        where: { action: { in: ["PAYMENT_FLAGGED_FOR_FRAUD", "PAYMENT_FRAUD_FLAG_CLEARED"] }, entityType: "Payment", entityId: params.paymentId },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    if (payment?.status === "DISPUTED" || payment?.status === "REVERSED") reasons.push("Chargeback or reversal reported by the gateway");
    if (latestFraudFlag?.action === "PAYMENT_FLAGGED_FOR_FRAUD") reasons.push("Manually flagged for fraud review");
  }

  return { passed: reasons.length === 0, reasons };
}

// Deliberately takes the plain client only, same reasoning executePayoutTransfer
// documents: the real Flutterwave call inside must never sit inside an open
// DB transaction. Every caller of this function must have already committed
// whatever transaction made the payout eligible before calling this — see
// confirmCustomerDelivery's and resolveDispute's own comments on why they
// return a payoutId instead of calling this themselves.
export async function attemptAutomaticPayoutRelease(db: typeof prisma, params: { payoutId: string }): Promise<{ released: boolean; reason: string | null }> {
  try {
    const payout = await db.payout.findUnique({ where: { id: params.payoutId } });
    if (!payout || payout.status !== "ELIGIBLE") return { released: false, reason: null };

    const risk = await runAutomaticReleaseRiskCheck(db, { orderId: payout.orderId, paymentId: payout.paymentId });
    const recipient = risk.passed ? await db.payoutRecipient.findUnique({ where: { businessId: payout.businessId } }) : null;
    const canFlutterwave = !!recipient && recipient.kycStatus === "VERIFIED" && !!recipient.providerRecipientCode;

    const skipReason = !risk.passed ? risk.reasons.join("; ") : !canFlutterwave ? "No verified payout account on file yet" : null;
    if (skipReason) {
      await db.payoutStatusHistory.create({
        data: { payoutId: params.payoutId, businessId: payout.businessId, previousStatus: "ELIGIBLE", newStatus: "ELIGIBLE", note: `Automatic release skipped: ${skipReason}` },
      });
      return { released: false, reason: skipReason };
    }

    await executePayoutTransfer(db, { payoutId: params.payoutId, businessId: payout.businessId, actorId: null });
    return { released: true, reason: null };
  } catch (error) {
    // Never let a failed automatic-release attempt break the request that
    // triggered eligibility (a customer confirming delivery, an admin
    // resolving a dispute, or the lazy window-expiry sweep) — on any
    // failure the payout simply stays ELIGIBLE, exactly where it already
    // showed up for manual handling before automatic release existed.
    const reason = error instanceof Error ? error.message : "Automatic release failed";
    console.error(`attemptAutomaticPayoutRelease failed for payout ${params.payoutId}:`, error);
    await raiseSystemAlert(db, {
      category: "PAYMENT_FAILURE",
      severity: "CRITICAL",
      title: "Automatic payout release failed",
      message: `Payout ${params.payoutId} failed to auto-release: ${reason}`,
      context: { payoutId: params.payoutId },
    });
    return { released: false, reason };
  }
}

// Part 25: staff-driven "process the payout" — records a status change and
// everything that follows from it (activity log, notifications, wardrobe
// timeline). Two ways this gets called: executePayoutTransfer below (a
// real Flutterwave transfer actually ran) or, for a business with no
// Flutterwave recipient on file yet, the original honest manual path
// (Payment.MANUAL's same pattern — an admin marks a real-world transfer
// they made outside the platform).
export async function processPayout(db: Db, params: { payoutId: string; businessId: string; status: "PROCESSING" | "PAID" | "FAILED"; providerReference?: string | null; failureReason?: string | null; actorId?: string | null }) {
  const payout = await db.payout.findUniqueOrThrow({ where: { id: params.payoutId } });
  if (payout.businessId !== params.businessId) throw new ApiError(404, "Payout not found");

  const previousStatus = payout.status;
  const updated = await db.payout.update({
    where: { id: params.payoutId },
    data: {
      status: params.status,
      processingAt: params.status === "PROCESSING" ? new Date() : undefined,
      paidAt: params.status === "PAID" ? new Date() : undefined,
      failedAt: params.status === "FAILED" ? new Date() : undefined,
      failureReason: params.status === "FAILED" ? params.failureReason : undefined,
      providerReference: params.providerReference,
      processedById: params.actorId,
    },
  });

  await db.payoutStatusHistory.create({
    data: { payoutId: params.payoutId, businessId: params.businessId, previousStatus, newStatus: params.status, actorId: params.actorId },
  });

  const order = await db.order.findUnique({ where: { id: payout.orderId } });

  await logFinancialTransaction(db, {
    businessId: params.businessId,
    type: params.status === "PAID" ? "PAYOUT_COMPLETED" : params.status === "FAILED" ? "PAYOUT_FAILED" : "PAYOUT_PROCESSING",
    description: `Payout ${params.status.toLowerCase()} for order ${order?.orderCode ?? payout.orderId}`,
    orderId: payout.orderId,
    amount: payout.netAmount,
    actorType: params.actorId ? "STAFF" : "SYSTEM",
    actorId: params.actorId,
  });

  if (params.status === "PAID") {
    await markOrderTimelineStage(db, { orderId: payout.orderId, businessId: params.businessId, stage: "PAYMENT_RELEASED", status: "COMPLETED", actorId: params.actorId });
    await logOrderActivity(db, { orderId: payout.orderId, businessId: params.businessId, type: "PAYOUT_PROCESSED", title: "Payment released to business", actorId: params.actorId });
    if (order?.customerProfileId) {
      await notifyCustomer(db, {
        businessId: params.businessId,
        customerProfileId: order.customerProfileId,
        title: "Payment released to the business",
        body: `Your order ${order.orderCode} is now fully complete.`,
        type: "success",
      });
    }
  }

  await notifyFinancialEvent(db, {
    businessId: params.businessId,
    orderId: payout.orderId,
    title: `Payout ${params.status.toLowerCase()}`,
    body: `Payout of ${payout.netAmount} for order ${order?.orderCode ?? ""} is now ${params.status.toLowerCase()}.`,
    type: params.status === "FAILED" ? "danger" : "success",
  });

  // A payout genuinely failing at the provider (discovered here whether an
  // admin manually processed it or refreshTransferStatus's async poll
  // found it out) is real money that didn't move as expected — worth a
  // platform-wide alert distinct from the business-facing notification
  // above, since nobody is necessarily watching this specific payout when
  // an async status poll is what surfaces the failure.
  if (params.status === "FAILED") {
    await raiseSystemAlert(db, {
      category: "ESCROW_ERROR",
      severity: "CRITICAL",
      title: "Payout transfer failed",
      message: `Payout ${payout.id} for order ${order?.orderCode ?? payout.orderId} failed: ${params.failureReason ?? "no reason given"}`,
      context: { payoutId: payout.id, orderId: payout.orderId, businessId: params.businessId },
    });
  }

  return updated;
}

// The real payout path: fires an actual Flutterwave transfer to the
// business's registered bank account (see lib/payout-recipients.ts) and
// records it as PROCESSING with the real transfer id as providerReference —
// never marked PAID here, since "instant" is Flutterwave's request for
// speed, not a guarantee; refreshTransferStatus below is what confirms it
// actually landed. Requires an admin to have verified the recipient (see
// setPayoutRecipientKycStatus) — Flutterwave resolving an account name at
// registration proves the account exists, not that it's this business's.
//
// Deliberately takes the plain client, not a transaction one: the
// Flutterwave call happens between the validation reads and the
// processPayout write, and a real HTTP call to a third-party API must
// never sit inside an open DB transaction — if the DB half then failed or
// timed out, we'd have money moved with no record of it. Only the final
// write (via processPayout) is wrapped in its own transaction.
export async function executePayoutTransfer(db: typeof prisma, params: { payoutId: string; businessId: string; actorId?: string | null }) {
  const payout = await db.payout.findUniqueOrThrow({ where: { id: params.payoutId } });
  if (payout.businessId !== params.businessId) throw new ApiError(404, "Payout not found");
  if (payout.status !== "ELIGIBLE") throw new ApiError(400, `Payout is ${payout.status.toLowerCase()}, not eligible to pay`);

  const recipient = await db.payoutRecipient.findUnique({ where: { businessId: params.businessId } });
  if (!recipient?.providerRecipientCode) throw new ApiError(400, "This business has no verified Flutterwave payout account on file yet");
  if (recipient.kycStatus !== "VERIFIED") throw new ApiError(400, "This business's payout account hasn't been verified by an admin yet");

  const order = await db.order.findUnique({ where: { id: payout.orderId } });

  const transfer = await createTransfer({
    recipientId: recipient.providerRecipientCode,
    amount: payout.netAmount,
    reference: `payout_${payout.id}`,
    narration: `Fashion360 payout for order ${order?.orderCode ?? payout.orderId}`,
  });

  return db.$transaction((tx) =>
    processPayout(tx, {
      payoutId: params.payoutId,
      businessId: params.businessId,
      status: "PROCESSING",
      providerReference: transfer.id,
      actorId: params.actorId,
    })
  );
}

// Polls Flutterwave for a PROCESSING payout's real status and advances it
// to PAID/FAILED once Flutterwave itself confirms — the honest alternative
// to assuming "instant" actually completed instantly. No webhook listener
// exists for transfer events yet, so this is admin-triggered ("Refresh
// Status" in /admin/payouts) rather than automatic; a future pass can add
// the webhook and call this from it instead.
export async function refreshTransferStatus(db: typeof prisma, params: { payoutId: string; businessId: string; actorId: string }) {
  const payout = await db.payout.findUniqueOrThrow({ where: { id: params.payoutId } });
  if (payout.businessId !== params.businessId) throw new ApiError(404, "Payout not found");
  if (payout.status !== "PROCESSING" || !payout.providerReference) {
    throw new ApiError(400, "This payout has no in-flight Flutterwave transfer to check");
  }

  const { status } = await getTransferStatus(payout.providerReference);
  const normalized = status.toLowerCase();

  if (normalized.includes("success")) {
    return db.$transaction((tx) =>
      processPayout(tx, { payoutId: params.payoutId, businessId: params.businessId, status: "PAID", providerReference: payout.providerReference, actorId: params.actorId })
    );
  }
  if (normalized.includes("fail")) {
    return db.$transaction((tx) =>
      processPayout(tx, {
        payoutId: params.payoutId,
        businessId: params.businessId,
        status: "FAILED",
        providerReference: payout.providerReference,
        failureReason: `Flutterwave reported status: ${status}`,
        actorId: params.actorId,
      })
    );
  }
  return { payout, transferStatus: status };
}
