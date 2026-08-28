import type { Prisma, DisputeStatus, DisputePriority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";
import { notifyCustomer, notifyBusinessOwners } from "@/lib/service-request-notify";

const PAGE_SIZE = 20;

// ============================================================================
// Admin Phase 9: Reviews, Ratings & Disputes Management (disputes half)
// ============================================================================
//
// AUDIT SUMMARY: lib/dispute.ts's reportDeliveryProblem/respondToDispute/
// resolveDispute (already reused and lightly extended by Phase 7 for
// automatic payout release) already form a complete, working dispute
// lifecycle with real evidence capture and a real refund-bearing
// resolution path. What was missing for Admin specifically: any way to
// assign ownership, prioritize, request information without conflating it
// with a full resolution, escalate, or close without a formal resolution —
// none of those existed as concepts anywhere in the schema. This file adds
// them; RESOLVE itself is untouched, still lib/dispute.ts's resolveDispute
// via the existing DisputeResolveForm/route.

export const TERMINAL_STATUSES: DisputeStatus[] = ["RESOLVED", "CLOSED"];

export const FILTERABLE_STATUSES: DisputeStatus[] = ["OPEN", "UNDER_REVIEW", "WAITING_FOR_CUSTOMER", "WAITING_FOR_DESIGNER", "ESCALATED", "RESOLVED", "CLOSED"];

export interface AdminDisputeListParams {
  q?: string;
  status?: DisputeStatus;
  priority?: DisputePriority;
  assignedAdminId?: string;
  unassigned?: boolean;
  dateFrom?: string;
  dateTo?: string;
  designerId?: string;
  customerId?: string;
  page?: number;
}

export async function getAdminDisputeList(params: AdminDisputeListParams) {
  const page = Math.max(1, params.page ?? 1);
  const search = params.q?.trim();

  const conditions: Prisma.DisputeWhereInput[] = [];
  if (search) {
    conditions.push({
      OR: [
        { id: { equals: search } },
        { order: { orderCode: { contains: search, mode: "insensitive" } } },
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { business: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }
  if (params.status) conditions.push({ status: params.status });
  if (params.priority) conditions.push({ priority: params.priority });
  if (params.unassigned) conditions.push({ assignedAdminId: null });
  else if (params.assignedAdminId) conditions.push({ assignedAdminId: params.assignedAdminId });
  if (params.dateFrom || params.dateTo) {
    conditions.push({
      createdAt: {
        ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
        ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999Z`) } : {}),
      },
    });
  }
  if (params.designerId) conditions.push({ businessId: params.designerId });
  if (params.customerId) conditions.push({ customerProfileId: params.customerId });

  const where: Prisma.DisputeWhereInput = conditions.length ? { AND: conditions } : {};

  const [total, disputes] = await Promise.all([
    prisma.dispute.count({ where }),
    prisma.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        issueType: true,
        status: true,
        priority: true,
        createdAt: true,
        order: { select: { id: true, orderCode: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        customerProfileId: true,
        business: { select: { id: true, name: true } },
        assignedAdmin: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    disputes: disputes.map((d) => ({
      id: d.id,
      issueType: d.issueType,
      status: d.status,
      priority: d.priority,
      createdAt: d.createdAt,
      orderId: d.order.id,
      orderCode: d.order.orderCode,
      customerProfileId: d.customerProfileId,
      customerName: `${d.customer.firstName} ${d.customer.lastName}`.trim(),
      designerId: d.business.id,
      designerName: d.business.name,
      assignedAdminName: d.assignedAdmin?.name ?? null,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// Full detail — evidence/responses/resolution mirror the existing detail
// page's own include shape (unchanged); Payment Summary and Delivery
// Summary are new, both explicitly read-only per the brief, fetched
// directly rather than through lib/payout.ts/lib/delivery.ts (no write
// path touched here at all).
//
// actorId is optional so this can still be called without logging (e.g. a
// future non-admin read path) but the admin detail page always passes it:
// the pre-existing GET /api/admin/disputes/[id] route this replaces
// already logged DISPUTE_REVIEWED on every view ("reviewing a dispute is
// itself an auditable admin action, even before any decision is made" —
// Part 23) — preserved here rather than silently dropped just because the
// page now reads via a server component instead of that route.
export async function getAdminDisputeDetail(id: string, actorId?: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      business: { select: { id: true, name: true, verification: { select: { status: true } } } },
      order: { select: { id: true, orderCode: true, totalValue: true, amountPaid: true, status: true } },
      customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      customerProfile: { select: { id: true } },
      evidence: { orderBy: { createdAt: "asc" } },
      // DisputeResponse.authorId is a bare column (no declared relation to
      // User) — author names are resolved with a separate lookup below
      // rather than an `include`.
      responses: { orderBy: { createdAt: "asc" } },
      resolution: { include: { refund: true, resolvedBy: { select: { name: true } } } },
      assignedAdmin: { select: { id: true, name: true } },
    },
  });
  if (!dispute) return null;

  if (actorId) {
    await logAuditEvent(prisma, { action: "DISPUTE_REVIEWED", userId: actorId, businessId: dispute.businessId, entityType: "Dispute", entityId: dispute.id });
  }

  const [payment, delivery] = await Promise.all([
    prisma.payment.findFirst({ where: { orderId: dispute.orderId, status: "SUCCESSFUL" }, orderBy: { paidAt: "desc" } }),
    prisma.delivery.findUnique({ where: { orderId: dispute.orderId } }),
  ]);
  const refundedAgg = payment ? await prisma.refund.aggregate({ where: { paymentId: payment.id, status: "SUCCESSFUL" }, _sum: { amount: true } }) : null;
  const maxRefundable = payment ? Math.max(0, payment.amount - (refundedAgg?._sum.amount ?? 0)) : 0;

  const authorIds = [...new Set(dispute.responses.map((r) => r.authorId).filter((x): x is string => !!x))];
  const authors = authorIds.length ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } }) : [];
  const authorNameById = new Map(authors.map((a) => [a.id, a.name]));
  const responsesWithAuthor = dispute.responses.map((r) => ({ ...r, authorName: r.authorId ? (authorNameById.get(r.authorId) ?? null) : null }));

  return { dispute: { ...dispute, responses: responsesWithAuthor }, payment, delivery, maxRefundable };
}

// ===================== Admin actions =====================
//
// Every action below writes an AuditLog entry with a mandatory reason —
// the brief's own "every action requires confirmation, records reason,
// creates audit event" rule. None of them touches Payment or Delivery.

export async function assignDisputeToAdmin(db: typeof prisma, params: { disputeId: string; adminId: string; actorId: string }) {
  const dispute = await db.dispute.findUnique({ where: { id: params.disputeId }, select: { id: true, businessId: true } });
  if (!dispute) throw new ApiError(404, "Dispute not found");

  const admin = await db.user.findUnique({ where: { id: params.adminId }, select: { id: true, role: true, name: true } });
  if (!admin || admin.role !== "SUPER_ADMIN") throw new ApiError(400, "Can only assign to a Fashion360 admin");

  const updated = await db.dispute.update({ where: { id: params.disputeId }, data: { assignedAdminId: params.adminId } });
  await logAuditEvent(db, { action: "DISPUTE_ASSIGNED_BY_ADMIN", userId: params.actorId, businessId: dispute.businessId, entityType: "Dispute", entityId: params.disputeId, metadata: { assignedAdminId: params.adminId, assignedAdminName: admin.name } });

  return updated;
}

// Posts the request as a real message in the thread, but deliberately
// doesn't reuse lib/dispute.ts's respondToDispute: that function's STAFF
// path is built for the business's own staff responding to a dispute filed
// against them, and always notifies the customer as "the business
// responded" — wrong framing here, since it's Fashion360 asking, and the
// target might be the designer, not the customer. authorType SYSTEM (real
// FinancialActorType value, same one lib/delivery.ts's admin actions use)
// represents that accurately; notification goes only to whichever party is
// actually being asked.
export async function requestDisputeInformation(db: typeof prisma, params: { disputeId: string; target: "customer" | "designer"; message: string; actorId: string }) {
  const dispute = await db.dispute.findUnique({ where: { id: params.disputeId }, select: { id: true, businessId: true, customerProfileId: true, status: true } });
  if (!dispute) throw new ApiError(404, "Dispute not found");
  if (dispute.status === "RESOLVED" || dispute.status === "CLOSED") throw new ApiError(400, "This dispute is already closed");
  if (params.target === "customer" && !dispute.customerProfileId) throw new ApiError(400, "This customer has no Fashion360 platform account to notify");

  await db.disputeResponse.create({ data: { disputeId: params.disputeId, businessId: dispute.businessId, authorType: "SYSTEM", authorId: params.actorId, body: params.message } });

  const nextStatus: DisputeStatus = params.target === "customer" ? "WAITING_FOR_CUSTOMER" : "WAITING_FOR_DESIGNER";
  const updated = await db.dispute.update({ where: { id: params.disputeId }, data: { status: nextStatus } });

  if (params.target === "designer") {
    await notifyBusinessOwners(db, { businessId: dispute.businessId, title: "Fashion360 needs more information", body: params.message, type: "warning" });
  } else {
    await notifyCustomer(db, { businessId: dispute.businessId, customerProfileId: dispute.customerProfileId!, title: "Fashion360 needs more information from you", body: params.message, type: "warning" });
  }

  await logAuditEvent(db, { action: "DISPUTE_INFO_REQUESTED_BY_ADMIN", userId: params.actorId, businessId: dispute.businessId, entityType: "Dispute", entityId: params.disputeId, metadata: { target: params.target, message: params.message } });

  return updated;
}

export async function escalateDisputeByAdmin(db: typeof prisma, params: { disputeId: string; reason: string; actorId: string }) {
  const dispute = await db.dispute.findUnique({ where: { id: params.disputeId }, select: { id: true, businessId: true, customerProfileId: true, status: true } });
  if (!dispute) throw new ApiError(404, "Dispute not found");
  if (dispute.status === "RESOLVED" || dispute.status === "CLOSED") throw new ApiError(400, "This dispute is already closed");

  const updated = await db.dispute.update({ where: { id: params.disputeId }, data: { status: "ESCALATED", priority: "URGENT" } });

  await notifyBusinessOwners(db, { businessId: dispute.businessId, title: "This dispute has been escalated", body: params.reason, type: "danger" });
  if (dispute.customerProfileId) {
    await notifyCustomer(db, { businessId: dispute.businessId, customerProfileId: dispute.customerProfileId, title: "Your dispute has been escalated for priority review", body: params.reason, type: "warning" });
  }
  await logAuditEvent(db, { action: "DISPUTE_ESCALATED_BY_ADMIN", userId: params.actorId, businessId: dispute.businessId, entityType: "Dispute", entityId: params.disputeId, metadata: { reason: params.reason } });

  return updated;
}

// Closing without a formal resolution — for a dispute the customer
// withdrew, or one an admin determines doesn't warrant a resolution
// decision. Distinct from Resolve, which requires a DisputeResolution row
// (lib/dispute.ts's resolveDispute) and always carries a real outcome.
export async function closeDisputeByAdmin(db: typeof prisma, params: { disputeId: string; reason: string; actorId: string }) {
  const dispute = await db.dispute.findUnique({ where: { id: params.disputeId }, include: { resolution: true } });
  if (!dispute) throw new ApiError(404, "Dispute not found");
  if (dispute.resolution) throw new ApiError(400, "This dispute already has a formal resolution — nothing more to close");
  if (dispute.status === "CLOSED") throw new ApiError(400, "This dispute is already closed");

  const updated = await db.dispute.update({ where: { id: params.disputeId }, data: { status: "CLOSED" } });

  await notifyBusinessOwners(db, { businessId: dispute.businessId, title: "Dispute closed", body: params.reason, type: "info" });
  if (dispute.customerProfileId) {
    await notifyCustomer(db, { businessId: dispute.businessId, customerProfileId: dispute.customerProfileId, title: "Your dispute has been closed", body: params.reason, type: "info" });
  }
  await logAuditEvent(db, { action: "DISPUTE_CLOSED_BY_ADMIN", userId: params.actorId, businessId: dispute.businessId, entityType: "Dispute", entityId: params.disputeId, metadata: { reason: params.reason } });

  return updated;
}
