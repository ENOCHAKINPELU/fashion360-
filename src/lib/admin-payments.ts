import type { Prisma, PaymentStatus, PayoutStatus, RefundStatus, PaymentMethod, PaymentProviderType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { processPayout, executePayoutTransfer } from "@/lib/payout";
import { initiateRefundForPayment } from "@/lib/refund-processing";
import { addAdminOrderNote } from "@/lib/admin-orders";
import { HIGH_VALUE_THRESHOLD_NGN } from "@/lib/admin-customers";

const PAGE_SIZE = 20;

// ============================================================================
// Admin Phase 7: Payment & Escrow Management
// ============================================================================
//
// AUDIT SUMMARY (see the phase report for the full write-up): Fashion360
// already collects every customer payment into its own platform Flutterwave
// balance and holds it there under its own control until an order is
// fulfilled, delivered, and confirmed — see lib/payment-architecture.ts,
// the source of truth for this. That IS the "escrow" this phase's brief
// describes; it just isn't literal regulated escrow (no third-party escrow
// agent, no segregated trust account), which is why the code and the UI
// built here say "held by Fashion360" rather than claiming "escrow" as a
// literal fact. No new Payment/Payout/Refund model was created — this file
// is entirely a read-mostly layer over Payment, Payout, Refund, Dispute,
// and FinancialTransaction, exactly as Phase 5/6 were built over
// ServiceRequest/Order. The only schema changes this phase made are
// additive: PayoutStatus.ON_HOLD (a real gap — the existing payout flow
// could only be ELIGIBLE, paid, or FAILED, with no way to pause one for
// review) and five AuditLogAction values, four of which already existed in
// the enum, reserved but never written by any code path until now
// (PAYOUT_APPROVED_BY_ADMIN, PAYOUT_RETRIED_BY_ADMIN, REFUND_APPROVED_BY_ADMIN,
// REFUND_REJECTED_BY_ADMIN).

export type EscrowStatus = "AWAITING_PAYMENT" | "HELD_IN_ESCROW" | "ELIGIBLE_FOR_RELEASE" | "PENDING_APPROVAL" | "RELEASED" | "REFUNDED" | "CANCELLED";

export const ESCROW_STATUS_LABELS: Record<EscrowStatus, string> = {
  AWAITING_PAYMENT: "Awaiting Payment",
  HELD_IN_ESCROW: "Held in Escrow",
  ELIGIBLE_FOR_RELEASE: "Eligible for Release",
  PENDING_APPROVAL: "Pending Approval",
  RELEASED: "Released",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

const AWAITING_PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "INITIALIZED", "PROCESSING", "FAILED", "AMOUNT_MISMATCH"];

// The brief's 7 escrow statuses, derived entirely from real fields on
// Payment/Payout/Dispute — never a new stored field. Same discipline
// Phase 5/6's "Needs Attention" flags used: compute from what's real rather
// than adding a status column that could drift from the fields that
// actually govern money movement (lib/payout.ts's evaluatePayoutEligibility
// is still the only place eligibility is decided; this function only
// *describes* the outcome of that logic for the admin UI).
export function deriveEscrowStatus(params: { paymentStatus: PaymentStatus; orderStatus: string; payoutStatus: PayoutStatus | null; hasActiveDispute: boolean }): EscrowStatus {
  const { paymentStatus, orderStatus, payoutStatus, hasActiveDispute } = params;
  if (paymentStatus === "CANCELLED" || orderStatus === "CANCELLED") return "CANCELLED";
  if (AWAITING_PAYMENT_STATUSES.includes(paymentStatus)) return "AWAITING_PAYMENT";
  if (payoutStatus === "PAID") return "RELEASED";
  if (paymentStatus === "FULLY_REFUNDED") return "REFUNDED";
  if (hasActiveDispute || payoutStatus === "ON_HOLD") return "PENDING_APPROVAL";
  if (payoutStatus === "ELIGIBLE" || payoutStatus === "PROCESSING") return "ELIGIBLE_FOR_RELEASE";
  return "HELD_IN_ESCROW";
}

// ===================== Fraud signals =====================
//
// The five real signals the brief asks for, each either a cheap indexed
// aggregate or a direct field already on Payment/PayoutStatusHistory — same
// "resolveAttentionFlags" idiom Phase 5/6/7 already established. "Manual
// review" reuses AuditLog (PAYMENT_FLAGGED_FOR_FRAUD / _CLEARED) rather than
// a new boolean column on Payment, so flagging a payment needs no schema
// write beyond the audit trail the brief already requires for the action.

export const MULTIPLE_FAILED_ATTEMPTS_THRESHOLD = 3;
export const REPEATED_PAYOUT_FAILURE_THRESHOLD = 2;

export interface FraudSignal {
  paymentId: string;
  reason: string;
  since: Date;
}

async function getManuallyFlaggedPaymentIds(): Promise<Map<string, { reason: string; since: Date }>> {
  const rows = await prisma.auditLog.findMany({
    where: { action: { in: ["PAYMENT_FLAGGED_FOR_FRAUD", "PAYMENT_FRAUD_FLAG_CLEARED"] }, entityType: "Payment" },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, action: true, createdAt: true, metadata: true },
  });
  const seen = new Set<string>();
  const flagged = new Map<string, { reason: string; since: Date }>();
  for (const r of rows) {
    if (!r.entityId || seen.has(r.entityId)) continue;
    seen.add(r.entityId);
    if (r.action === "PAYMENT_FLAGGED_FOR_FRAUD") {
      const reason = r.metadata && typeof r.metadata === "object" && "reason" in r.metadata ? String((r.metadata as Record<string, unknown>).reason) : "Flagged for manual review";
      flagged.set(r.entityId, { reason, since: r.createdAt });
    }
  }
  return flagged;
}

async function resolveFraudSignals(): Promise<FraudSignal[]> {
  const [duplicateGroups, failedGroups, chargebacks, repeatedPayoutFailures, manuallyFlagged] = await Promise.all([
    prisma.payment.groupBy({ by: ["orderId"], where: { status: "SUCCESSFUL" }, _count: true, having: { orderId: { _count: { gte: 2 } } } }),
    prisma.payment.groupBy({ by: ["orderId"], where: { status: "FAILED" }, _count: true, having: { orderId: { _count: { gte: MULTIPLE_FAILED_ATTEMPTS_THRESHOLD } } } }),
    prisma.payment.findMany({ where: { status: { in: ["DISPUTED", "REVERSED"] } }, select: { id: true, updatedAt: true } }),
    prisma.payoutStatusHistory.groupBy({ by: ["payoutId"], where: { newStatus: "FAILED" }, _count: true, having: { payoutId: { _count: { gte: REPEATED_PAYOUT_FAILURE_THRESHOLD } } } }),
    getManuallyFlaggedPaymentIds(),
  ]);

  const signals: FraudSignal[] = [...chargebacks.map((p) => ({ paymentId: p.id, reason: "Chargeback or reversal reported by the gateway", since: p.updatedAt }))];

  if (duplicateGroups.length) {
    const orderIds = duplicateGroups.map((g) => g.orderId);
    const payments = await prisma.payment.findMany({ where: { orderId: { in: orderIds }, status: "SUCCESSFUL" }, orderBy: { createdAt: "desc" }, select: { id: true, orderId: true, createdAt: true } });
    const latestByOrder = new Map<string, { id: string; createdAt: Date }>();
    for (const p of payments) if (!latestByOrder.has(p.orderId)) latestByOrder.set(p.orderId, p);
    for (const p of latestByOrder.values()) signals.push({ paymentId: p.id, reason: "Duplicate payment — more than one successful charge on this order", since: p.createdAt });
  }

  if (failedGroups.length) {
    const orderIds = failedGroups.map((g) => g.orderId);
    const payments = await prisma.payment.findMany({ where: { orderId: { in: orderIds } }, orderBy: { createdAt: "desc" }, select: { id: true, orderId: true, createdAt: true } });
    const latestByOrder = new Map<string, { id: string; createdAt: Date }>();
    for (const p of payments) if (!latestByOrder.has(p.orderId)) latestByOrder.set(p.orderId, p);
    for (const p of latestByOrder.values()) signals.push({ paymentId: p.id, reason: `${MULTIPLE_FAILED_ATTEMPTS_THRESHOLD}+ failed payment attempts on this order`, since: p.createdAt });
  }

  if (repeatedPayoutFailures.length) {
    const payoutIds = repeatedPayoutFailures.map((g) => g.payoutId);
    const payouts = await prisma.payout.findMany({ where: { id: { in: payoutIds } }, select: { paymentId: true, updatedAt: true } });
    for (const p of payouts) if (p.paymentId) signals.push({ paymentId: p.paymentId, reason: "Suspicious payout — repeated transfer failures", since: p.updatedAt });
  }

  for (const [paymentId, flag] of manuallyFlagged) signals.push({ paymentId, reason: flag.reason, since: flag.since });

  return signals;
}

// ===================== Payment list & stats =====================

export interface AdminPaymentListParams {
  q?: string;
  status?: PaymentStatus;
  escrowStatus?: EscrowStatus;
  payoutStatus?: PayoutStatus;
  refundStatus?: RefundStatus;
  method?: PaymentMethod;
  provider?: PaymentProviderType;
  dateFrom?: string;
  dateTo?: string;
  highValue?: boolean;
  fraudOnly?: boolean;
  designerId?: string;
  customerId?: string;
  page?: number;
}

export async function getAdminPaymentList(params: AdminPaymentListParams) {
  const page = Math.max(1, params.page ?? 1);
  const search = params.q?.trim();

  const [activeDisputeOrderIds, fraudSignals] = await Promise.all([
    prisma.dispute.findMany({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } }, select: { orderId: true } }).then((rows) => new Set(rows.map((r) => r.orderId))),
    resolveFraudSignals(),
  ]);
  const fraudByPaymentId = new Map<string, FraudSignal>();
  for (const f of fraudSignals) if (!fraudByPaymentId.has(f.paymentId)) fraudByPaymentId.set(f.paymentId, f);

  const conditions: Prisma.PaymentWhereInput[] = [];
  if (search) {
    conditions.push({
      OR: [
        { id: { equals: search } },
        { idempotencyKey: { equals: search } },
        { providerReference: { contains: search, mode: "insensitive" } },
        { order: { orderCode: { contains: search, mode: "insensitive" } } },
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { business: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }
  if (params.status) conditions.push({ status: params.status });
  if (params.method) conditions.push({ method: params.method });
  if (params.provider) conditions.push({ provider: params.provider });
  if (params.payoutStatus) conditions.push({ payouts: { some: { status: params.payoutStatus } } });
  if (params.refundStatus) conditions.push({ refunds: { some: { status: params.refundStatus } } });
  if (params.dateFrom || params.dateTo) {
    conditions.push({
      createdAt: {
        ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
        ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999Z`) } : {}),
      },
    });
  }
  if (params.highValue) conditions.push({ amount: { gte: HIGH_VALUE_THRESHOLD_NGN } });
  if (params.designerId) conditions.push({ businessId: params.designerId });
  if (params.customerId) conditions.push({ order: { customerProfileId: params.customerId } });
  if (params.fraudOnly) conditions.push({ id: { in: [...fraudByPaymentId.keys()] } });

  const where: Prisma.PaymentWhereInput = conditions.length ? { AND: conditions } : {};

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        amount: true,
        currency: true,
        method: true,
        provider: true,
        status: true,
        paidAt: true,
        createdAt: true,
        order: { select: { id: true, orderCode: true, status: true, customerProfileId: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        business: { select: { id: true, name: true } },
        payouts: { select: { id: true, status: true, netAmount: true, platformFee: true }, take: 1 },
        refunds: { select: { status: true, amount: true } },
      },
    }),
  ]);

  return {
    payments: payments.map((p) => {
      const payout = p.payouts[0] ?? null;
      const refundedAmount = p.refunds.filter((r) => r.status === "SUCCESSFUL").reduce((sum, r) => sum + r.amount, 0);
      const escrowStatus = deriveEscrowStatus({
        paymentStatus: p.status,
        orderStatus: p.order.status,
        payoutStatus: payout?.status ?? null,
        hasActiveDispute: activeDisputeOrderIds.has(p.order.id),
      });
      return {
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        provider: p.provider,
        status: p.status,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        orderId: p.order.id,
        orderCode: p.order.orderCode,
        customerProfileId: p.order.customerProfileId,
        customerName: `${p.customer.firstName} ${p.customer.lastName}`.trim(),
        designerId: p.business.id,
        designerName: p.business.name,
        platformFee: payout?.platformFee ?? null,
        designerEarnings: payout?.netAmount ?? null,
        payoutStatus: payout?.status ?? null,
        refundedAmount,
        escrowStatus,
        fraud: fraudByPaymentId.get(p.id) ?? null,
      };
    }),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// The brief's 8 summary cards. "Escrow Balance" is the one figure with no
// existing home anywhere in the app — everything else already exists in
// some form on /admin/payouts, recomputed here to match this page's own
// framing. Kept as aggregate/groupBy calls, never a per-row loop.
export async function getAdminPaymentStats() {
  const [totalRevenueAgg, refundedAgg, payoutsPaidAgg, pendingCount, successfulCount, failedCount, payoutsEligibleAgg, payoutsPaidCount, refundCount] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true } }),
    prisma.refund.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { status: "PAID" }, _sum: { netAmount: true } }),
    prisma.payment.count({ where: { status: { in: ["PENDING", "INITIALIZED", "PROCESSING"] } } }),
    prisma.payment.count({ where: { status: "SUCCESSFUL" } }),
    prisma.payment.count({ where: { status: { in: ["FAILED", "AMOUNT_MISMATCH"] } } }),
    prisma.payout.aggregate({ where: { status: { in: ["ELIGIBLE", "ON_HOLD"] } }, _sum: { netAmount: true }, _count: true }),
    prisma.payout.count({ where: { status: "PAID" } }),
    prisma.refund.count(),
  ]);

  const totalRevenue = totalRevenueAgg._sum.amount ?? 0;
  const refunded = refundedAgg._sum.amount ?? 0;
  const paidOut = payoutsPaidAgg._sum.netAmount ?? 0;
  // What Fashion360 is still holding right now: everything successfully
  // collected, minus everything refunded back out, minus everything already
  // transferred out to a business — matches the "Pending Payouts... real
  // money Fashion360 is currently holding" framing /admin/payouts already
  // uses (lib/payment-architecture.ts is the source of truth for this).
  const escrowBalance = Math.max(0, totalRevenue - refunded - paidOut);

  return {
    totalRevenue,
    escrowBalance,
    pendingPayments: pendingCount,
    successfulPayments: successfulCount,
    failedPayments: failedCount,
    pendingPayouts: payoutsEligibleAgg._sum.netAmount ?? 0,
    pendingPayoutsCount: payoutsEligibleAgg._count,
    completedPayouts: payoutsPaidCount,
    refundRequests: refundCount,
  };
}

// ===================== Payment detail =====================

export async function getAdminPaymentDetail(id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          orderCode: true,
          status: true,
          totalValue: true,
          customer: { select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true } },
          customerProfile: { select: { id: true } },
          assignedDesignerId: true,
        },
      },
      customer: { select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true } },
      business: { select: { id: true, name: true, city: true, country: true, verification: { select: { status: true } } } },
      invoice: { select: { id: true, invoiceNumber: true, total: true, amountPaid: true, balanceDue: true } },
      recordedBy: { select: { name: true } },
      refunds: { orderBy: { createdAt: "desc" }, include: { processedBy: { select: { name: true } } } },
      payouts: { include: { statusHistory: { orderBy: { createdAt: "desc" } } } },
    },
  });
  if (!payment) return null;

  const [activeDispute, financialHistory, recipient] = await Promise.all([
    prisma.dispute.findFirst({ where: { orderId: payment.orderId, status: { in: ["OPEN", "UNDER_REVIEW"] } }, select: { id: true, status: true, issueType: true } }),
    prisma.financialTransaction.findMany({ where: { OR: [{ paymentId: id }, { orderId: payment.orderId }] }, orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } }),
    prisma.payoutRecipient.findUnique({ where: { businessId: payment.businessId }, select: { kycStatus: true, bankName: true, accountNumber: true, accountName: true, providerRecipientCode: true } }),
  ]);

  const payout = payment.payouts[0] ?? null;
  const escrowStatus = deriveEscrowStatus({ paymentStatus: payment.status, orderStatus: payment.order.status, payoutStatus: payout?.status ?? null, hasActiveDispute: !!activeDispute });
  const manuallyFlagged = await getManuallyFlaggedPaymentIds();
  const fraud = manuallyFlagged.get(id) ?? null;
  const chargeback = payment.status === "DISPUTED" || payment.status === "REVERSED" ? { reason: "Chargeback or reversal reported by the gateway" } : null;

  return { payment, payout, activeDispute, financialHistory, recipient, escrowStatus, fraud, chargeback };
}

export async function getPaymentsNeedingFraudReview(limit = 10) {
  const signals = await resolveFraudSignals();
  if (signals.length === 0) return [];
  const byPaymentId = new Map<string, FraudSignal>();
  for (const s of signals) if (!byPaymentId.has(s.paymentId)) byPaymentId.set(s.paymentId, s);

  const sorted = [...byPaymentId.values()].sort((a, b) => b.since.getTime() - a.since.getTime()).slice(0, limit);
  const payments = await prisma.payment.findMany({
    where: { id: { in: sorted.map((s) => s.paymentId) } },
    select: { id: true, amount: true, currency: true, order: { select: { orderCode: true } }, business: { select: { name: true } } },
  });
  const byId = new Map(payments.map((p) => [p.id, p]));

  return sorted
    .map((s) => {
      const p = byId.get(s.paymentId);
      if (!p) return null;
      return { paymentId: p.id, orderCode: p.order.orderCode, designerName: p.business.name, amount: p.amount, currency: p.currency, reason: s.reason, since: s.since };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// ===================== Admin actions =====================
//
// Every action below wraps an existing, already-correct lib/payout.ts or
// lib/refund-processing.ts function rather than moving money itself — this
// file adds the admin-attributed audit trail (reason + AuditLog) the brief
// requires on top, never a second way to change a Payout's or Refund's
// state. "Admin cannot edit payment amounts" (the brief's own rule) falls
// out of this for free: nothing here ever calls payment.update on amount,
// status, or any other field — Payment itself is never written by this file.

export async function approvePayoutByAdmin(db: typeof prisma, params: { payoutId: string; reason: string; actorId: string }) {
  const payout = await db.payout.findUnique({ where: { id: params.payoutId } });
  if (!payout) throw new ApiError(404, "Payout not found");
  if (payout.status !== "ELIGIBLE") throw new ApiError(400, `Payout is ${payout.status.toLowerCase().replace(/_/g, " ")}, not eligible to approve`);

  const recipient = await db.payoutRecipient.findUnique({ where: { businessId: payout.businessId } });
  const canFlutterwave = recipient?.kycStatus === "VERIFIED" && !!recipient.providerRecipientCode;

  const updated = canFlutterwave
    ? await executePayoutTransfer(db, { payoutId: params.payoutId, businessId: payout.businessId, actorId: params.actorId })
    : await db.$transaction((tx) => processPayout(tx, { payoutId: params.payoutId, businessId: payout.businessId, status: "PAID", actorId: params.actorId }));

  await logAuditEvent(db, {
    action: "PAYOUT_APPROVED_BY_ADMIN",
    userId: params.actorId,
    businessId: payout.businessId,
    entityType: "Payout",
    entityId: params.payoutId,
    metadata: { reason: params.reason, method: canFlutterwave ? "flutterwave_transfer" : "manual" },
  });

  return updated;
}

export async function retryPayoutByAdmin(db: typeof prisma, params: { payoutId: string; reason: string; actorId: string }) {
  const payout = await db.payout.findUnique({ where: { id: params.payoutId } });
  if (!payout) throw new ApiError(404, "Payout not found");
  if (payout.status !== "FAILED") throw new ApiError(400, "Only a failed payout can be retried");

  const updated = await db.$transaction((tx) => processPayout(tx, { payoutId: params.payoutId, businessId: payout.businessId, status: "PROCESSING", actorId: params.actorId }));

  await logAuditEvent(db, {
    action: "PAYOUT_RETRIED_BY_ADMIN",
    userId: params.actorId,
    businessId: payout.businessId,
    entityType: "Payout",
    entityId: params.payoutId,
    metadata: { reason: params.reason },
  });

  return updated;
}

export async function holdPayoutByAdmin(db: typeof prisma, params: { payoutId: string; reason: string; actorId: string }) {
  const payout = await db.payout.findUnique({ where: { id: params.payoutId } });
  if (!payout) throw new ApiError(404, "Payout not found");
  if (payout.status !== "ELIGIBLE") throw new ApiError(400, "Only an eligible payout can be put on hold");

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.payout.update({ where: { id: params.payoutId }, data: { status: "ON_HOLD" } });
    await tx.payoutStatusHistory.create({ data: { payoutId: params.payoutId, businessId: payout.businessId, previousStatus: "ELIGIBLE", newStatus: "ON_HOLD", note: params.reason, actorId: params.actorId } });
    await logAuditEvent(tx, { action: "PAYOUT_HELD_BY_ADMIN", userId: params.actorId, businessId: payout.businessId, entityType: "Payout", entityId: params.payoutId, metadata: { reason: params.reason } });
    await notifyFinancialEvent(tx, {
      businessId: payout.businessId,
      orderId: payout.orderId,
      title: "Payout on hold",
      body: `Your payout for this order has been paused for review by Fashion360: ${params.reason}`,
      type: "warning",
    });
    return u;
  });

  return updated;
}

export async function releasePayoutHoldByAdmin(db: typeof prisma, params: { payoutId: string; reason: string; actorId: string }) {
  const payout = await db.payout.findUnique({ where: { id: params.payoutId } });
  if (!payout) throw new ApiError(404, "Payout not found");
  if (payout.status !== "ON_HOLD") throw new ApiError(400, "This payout isn't on hold");

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.payout.update({ where: { id: params.payoutId }, data: { status: "ELIGIBLE" } });
    await tx.payoutStatusHistory.create({ data: { payoutId: params.payoutId, businessId: payout.businessId, previousStatus: "ON_HOLD", newStatus: "ELIGIBLE", note: params.reason, actorId: params.actorId } });
    await logAuditEvent(tx, {
      action: "PAYOUT_HOLD_RELEASED_BY_ADMIN",
      userId: params.actorId,
      businessId: payout.businessId,
      entityType: "Payout",
      entityId: params.payoutId,
      metadata: { reason: params.reason },
    });
    await notifyFinancialEvent(tx, { businessId: payout.businessId, orderId: payout.orderId, title: "Payout hold released", body: `Your payout is eligible for release again: ${params.reason}`, type: "info" });
    return u;
  });

  return updated;
}

export async function rejectPayoutByAdmin(db: typeof prisma, params: { payoutId: string; reason: string; actorId: string }) {
  const payout = await db.payout.findUnique({ where: { id: params.payoutId } });
  if (!payout) throw new ApiError(404, "Payout not found");
  if (payout.status !== "ELIGIBLE" && payout.status !== "ON_HOLD") throw new ApiError(400, "Only an eligible or on-hold payout can be rejected");

  const updated = await db.$transaction((tx) => processPayout(tx, { payoutId: params.payoutId, businessId: payout.businessId, status: "FAILED", failureReason: `Rejected by Fashion360 admin: ${params.reason}`, actorId: params.actorId }));

  await logAuditEvent(db, { action: "PAYOUT_REJECTED_BY_ADMIN", userId: params.actorId, businessId: payout.businessId, entityType: "Payout", entityId: params.payoutId, metadata: { reason: params.reason } });

  return updated;
}

// Admin-initiated refund — a genuinely new capability (existing refund
// paths are business-initiated via POST /api/refunds, or dispute-resolution-
// driven via lib/dispute.ts's resolveDispute). Both of those already call
// the correct platform-aware refund path; this reuses the exact same
// function so an admin-initiated refund can never take a different, wrong
// path through a legacy per-business-gateway branch.
export async function processAdminRefund(db: typeof prisma, params: { paymentId: string; amount: number; type: "FULL" | "PARTIAL"; reason: string; actorId: string }) {
  const payment = await db.payment.findUnique({ where: { id: params.paymentId } });
  if (!payment) throw new ApiError(404, "Payment not found");

  const refund = await initiateRefundForPayment(db, {
    businessId: payment.businessId,
    paymentId: params.paymentId,
    amount: params.amount,
    type: params.type,
    reason: params.reason,
    processedById: params.actorId,
  });

  await logAuditEvent(db, {
    action: "REFUND_APPROVED_BY_ADMIN",
    userId: params.actorId,
    businessId: payment.businessId,
    entityType: "Refund",
    entityId: refund.id,
    metadata: { paymentId: params.paymentId, amount: params.amount, reason: params.reason },
  });

  return refund;
}

// Declining to refund is, today, a documented decision rather than a state
// change — there's no "pending refund request" row anywhere in the schema
// to move to a REJECTED status (a customer/business report becomes a real
// Refund only once someone actually initiates one, at which point it
// either succeeds or fails against the gateway). This still satisfies the
// brief's "Reject refund" control and its audit-log requirement honestly:
// it's recorded, just not modeled as a rejected Refund row that never
// existed.
export async function rejectAdminRefundRequest(db: typeof prisma, params: { paymentId: string; reason: string; actorId: string }) {
  const payment = await db.payment.findUnique({ where: { id: params.paymentId }, select: { id: true, businessId: true } });
  if (!payment) throw new ApiError(404, "Payment not found");

  await logAuditEvent(db, { action: "REFUND_REJECTED_BY_ADMIN", userId: params.actorId, businessId: payment.businessId, entityType: "Payment", entityId: params.paymentId, metadata: { reason: params.reason } });
}

export async function flagPaymentForFraud(db: typeof prisma, params: { paymentId: string; reason: string; actorId: string }) {
  const payment = await db.payment.findUnique({ where: { id: params.paymentId }, select: { id: true, businessId: true } });
  if (!payment) throw new ApiError(404, "Payment not found");

  await logAuditEvent(db, { action: "PAYMENT_FLAGGED_FOR_FRAUD", userId: params.actorId, businessId: payment.businessId, entityType: "Payment", entityId: params.paymentId, metadata: { reason: params.reason } });
}

export async function clearPaymentFraudFlag(db: typeof prisma, params: { paymentId: string; reason: string; actorId: string }) {
  const payment = await db.payment.findUnique({ where: { id: params.paymentId }, select: { id: true, businessId: true } });
  if (!payment) throw new ApiError(404, "Payment not found");

  await logAuditEvent(db, { action: "PAYMENT_FRAUD_FLAG_CLEARED", userId: params.actorId, businessId: payment.businessId, entityType: "Payment", entityId: params.paymentId, metadata: { reason: params.reason } });
}

// "Investigate payment" (brief) reuses Phase 6's admin-only OrderNote
// (category ADMIN — never visible to the business or customer) rather than
// a second internal-notes system scoped to Payment.
export async function investigatePayment(db: typeof prisma, params: { paymentId: string; note: string; actorId: string }) {
  const payment = await db.payment.findUnique({ where: { id: params.paymentId }, select: { orderId: true } });
  if (!payment) throw new ApiError(404, "Payment not found");
  return addAdminOrderNote(db, { orderId: payment.orderId, body: params.note, actorId: params.actorId });
}
