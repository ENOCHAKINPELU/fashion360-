import type { Prisma, DisputeIssueType, DisputeResolutionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logOrderActivity } from "@/lib/order-activity";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { notifyCustomer } from "@/lib/service-request-notify";
import { initiateRefundForPayment } from "@/lib/refund-processing";
import { makePayoutEligible } from "@/lib/payout";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 19/22: "Report a Problem" — payout eligibility is blocked (the
// business already has the funds; see lib/payment-architecture.ts), the
// order moves to DISPUTED, and the business is notified. No arbitration
// logic here by design (Part 22 explicitly scopes this phase to the
// foundation: evidence capture, response, and a single authorized
// resolution decision).
export async function reportDeliveryProblem(
  db: Db,
  params: {
    orderId: string;
    customerProfileId: string;
    issueType: DisputeIssueType;
    description: string;
    photos?: string[];
    videos?: string[];
  }
) {
  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId } });
  if (order.customerProfileId !== params.customerProfileId) throw new ApiError(404, "Order not found");

  const delivery = await db.delivery.findUnique({ where: { orderId: params.orderId } });
  if (!delivery || delivery.status !== "DELIVERED") throw new ApiError(400, "This order hasn't been marked delivered yet");
  if (delivery.customerConfirmedAt) throw new ApiError(400, "You've already confirmed receipt of this order");

  const existingOpenDispute = await db.dispute.findFirst({ where: { orderId: params.orderId, status: { in: ["OPEN", "UNDER_REVIEW"] } } });
  if (existingOpenDispute) throw new ApiError(409, "There's already an open dispute for this order");

  const dispute = await db.dispute.create({
    data: {
      orderId: params.orderId,
      businessId: order.businessId,
      customerId: order.customerId,
      customerProfileId: params.customerProfileId,
      issueType: params.issueType,
      description: params.description,
      status: "OPEN",
      evidence: { create: { businessId: order.businessId, submittedByType: "CUSTOMER", photos: params.photos ?? [], videos: params.videos ?? [], description: params.description } },
    },
  });

  await db.delivery.update({ where: { orderId: params.orderId }, data: { reportedProblemAt: new Date() } });
  await db.order.update({ where: { id: params.orderId }, data: { status: "DISPUTED" } });

  await logOrderActivity(db, { orderId: params.orderId, businessId: order.businessId, type: "DISPUTE_CREATED", title: "Customer reported a problem", description: params.description });
  await logFinancialTransaction(db, {
    businessId: order.businessId,
    type: "DISPUTE_CREATED",
    description: `Dispute opened for order ${order.orderCode}`,
    orderId: params.orderId,
    customerId: order.customerId,
    actorType: "CUSTOMER",
  });
  await notifyFinancialEvent(db, {
    businessId: order.businessId,
    orderId: params.orderId,
    assignedDesignerId: order.assignedDesignerId,
    title: "Customer reported a problem",
    body: `${order.orderCode}: ${params.description}`,
    type: "danger",
  });

  await notifyCustomer(db, {
    businessId: order.businessId,
    customerProfileId: params.customerProfileId,
    title: "Your report has been submitted",
    body: `We've notified the business about the problem with order ${order.orderCode}. This is now under review and blocks payout eligibility for this order.`,
    type: "info",
  });

  return dispute;
}

export async function respondToDispute(db: Db, params: { disputeId: string; businessId: string; authorType: "STAFF" | "CUSTOMER"; authorId?: string | null; body: string }) {
  const dispute = await db.dispute.findUniqueOrThrow({ where: { id: params.disputeId } });
  if (dispute.businessId !== params.businessId) throw new ApiError(404, "Dispute not found");
  if (dispute.status === "RESOLVED" || dispute.status === "CLOSED") throw new ApiError(400, "This dispute is already closed");

  const response = await db.disputeResponse.create({
    data: { disputeId: params.disputeId, businessId: params.businessId, authorType: params.authorType, authorId: params.authorId, body: params.body },
  });

  if (dispute.status === "OPEN") {
    await db.dispute.update({ where: { id: params.disputeId }, data: { status: "UNDER_REVIEW" } });
  }

  const order = await db.order.findUnique({ where: { id: dispute.orderId } });
  if (params.authorType === "STAFF" && order?.customerProfileId) {
    await notifyCustomer(db, {
      businessId: params.businessId,
      customerProfileId: order.customerProfileId,
      title: "The business responded to your report",
      body: params.body,
      type: "info",
    });
  } else if (params.authorType === "CUSTOMER") {
    await notifyFinancialEvent(db, {
      businessId: params.businessId,
      orderId: dispute.orderId,
      assignedDesignerId: order?.assignedDesignerId,
      title: "New message on dispute",
      body: params.body,
      type: "warning",
    });
  }

  return response;
}

// Part 23: the single, explicitly-authorized resolution decision. A
// refund-bearing outcome creates a real Refund via the same path as the
// staff-initiated refund route (Part 24) — never automatic, always tied to
// this one recorded decision.
export async function resolveDispute(
  db: Db,
  params: {
    disputeId: string;
    businessId: string;
    resolutionType: DisputeResolutionType;
    notes: string;
    refundAmount?: number;
    paymentId?: string;
    resolvedById: string;
  }
) {
  const dispute = await db.dispute.findUniqueOrThrow({ where: { id: params.disputeId }, include: { resolution: true } });
  if (dispute.businessId !== params.businessId) throw new ApiError(404, "Dispute not found");
  if (dispute.resolution) throw new ApiError(400, "This dispute has already been resolved");

  let refundId: string | null = null;
  if ((params.resolutionType === "PARTIAL_REFUND" || params.resolutionType === "FULL_REFUND") && params.paymentId && params.refundAmount) {
    const refund = await initiateRefundForPayment(db, {
      businessId: params.businessId,
      paymentId: params.paymentId,
      amount: params.refundAmount,
      type: params.resolutionType === "FULL_REFUND" ? "FULL" : "PARTIAL",
      reason: `Dispute resolution: ${params.notes}`,
      processedById: params.resolvedById,
    });
    refundId = refund.id;
  }

  const resolution = await db.disputeResolution.create({
    data: {
      disputeId: params.disputeId,
      businessId: params.businessId,
      resolutionType: params.resolutionType,
      notes: params.notes,
      refundId,
      resolvedById: params.resolvedById,
    },
  });

  await db.dispute.update({ where: { id: params.disputeId }, data: { status: "RESOLVED" } });

  const order = await db.order.findUniqueOrThrow({ where: { id: dispute.orderId } });

  if (params.resolutionType === "CANCEL_ORDER") {
    await db.order.update({ where: { id: dispute.orderId }, data: { status: "CANCELLED" } });
  } else if (params.resolutionType === "REWORK_REQUIRED" || params.resolutionType === "RETURN_REQUIRED") {
    await db.order.update({ where: { id: dispute.orderId }, data: { status: "IN_PRODUCTION" } });
  } else if (params.resolutionType === "RELEASE_FULL_PAYMENT") {
    await db.order.update({ where: { id: dispute.orderId }, data: { status: "DELIVERED" } });
    await makePayoutEligible(db, { orderId: dispute.orderId, businessId: params.businessId, actorId: params.resolvedById });
  } else {
    // A refund alone doesn't complete the order — money already moved back
    // to the customer, but the garment relationship still needs a business
    // decision on whether the order itself is done.
    await db.order.update({ where: { id: dispute.orderId }, data: { status: "REFUNDED" } });
  }

  await logOrderActivity(db, { orderId: dispute.orderId, businessId: params.businessId, type: "DISPUTE_RESOLVED", title: `Dispute resolved: ${params.resolutionType.replace(/_/g, " ")}`, description: params.notes, actorId: params.resolvedById });
  await logFinancialTransaction(db, {
    businessId: params.businessId,
    type: "DISPUTE_RESOLVED",
    description: `Dispute resolved for order ${order.orderCode}: ${params.resolutionType}`,
    orderId: dispute.orderId,
    customerId: dispute.customerId,
    actorType: "STAFF",
    actorId: params.resolvedById,
  });

  await notifyFinancialEvent(db, {
    businessId: params.businessId,
    orderId: dispute.orderId,
    assignedDesignerId: order.assignedDesignerId,
    title: "Dispute resolved",
    body: `${order.orderCode}: ${params.resolutionType.replace(/_/g, " ")}.`,
    type: "info",
  });

  if (order.customerProfileId) {
    await notifyCustomer(db, {
      businessId: params.businessId,
      customerProfileId: order.customerProfileId,
      title: "Your dispute has been resolved",
      body: params.notes,
      type: "info",
    });
  }

  return resolution;
}
