import type { Prisma, ServiceRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";
import { notifyCustomer, notifyBusinessOwners } from "@/lib/service-request-notify";

const PAGE_SIZE = 20;

// Admin Phase 5 uses ServiceRequest's real, already-enforced lifecycle
// (schema.prisma's ServiceRequestStatus, already used by the customer and
// business request flows — see api/service-requests/[id]/cancel and
// api/business/service-requests/[id]/respond) rather than inventing a
// simplified PENDING/ACCEPTED/IN_PROGRESS/COMPLETED status set. DRAFT is
// excluded everywhere below: the field defaults to SUBMITTED and nothing in
// the app ever persists a request in DRAFT, so it's never a real "submitted
// request" for Admin to see.
//
// This duplicates the same literal list already living in three other
// files (admin-dashboard.ts's REQUEST_TERMINAL_STATUSES, and the TERMINAL
// consts in the two API routes above) — matching this codebase's existing
// convention of a small local copy per file rather than a shared export.
const TERMINAL_STATUSES: ServiceRequestStatus[] = ["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED", "CONVERTED_TO_APPOINTMENT", "CONVERTED_TO_ORDER"];

// Real, filterable statuses shown in the Admin UI — every value except
// DRAFT (see above).
export const FILTERABLE_STATUSES: ServiceRequestStatus[] = [
  "SUBMITTED",
  "RECEIVED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
  "EXPIRED",
  "CONVERTED_TO_APPOINTMENT",
  "CONVERTED_TO_ORDER",
];

// Configurable "stuck request" thresholds (brief #12/#13): no SLA exists
// yet anywhere in Fashion360 for service requests, so these are plain,
// documented, adjustable numbers — same reasoning as Phase 3/4's
// HIGH_VALUE_THRESHOLD_NGN / MOST_ACTIVE_ORDER_THRESHOLD — not a business
// rule invented and hidden inside a query.
export const STUCK_PENDING_RESPONSE_HOURS = 48; // business hasn't viewed/responded to a new request
export const STUCK_UNDER_REVIEW_DAYS = 5; // conversation open, neither side has finalized
export const REPEATED_REVISIONS_THRESHOLD = 3; // INFO_REQUESTED / ALTERNATIVE_DATE_PROPOSED round-trips
export const RECENT_CANCELLED_WINDOW_DAYS = 7; // surfaced for visibility, not action

export interface AttentionFlag {
  requestId: string;
  reason: string;
  since: Date;
}

// The four real signals #12 asks for, each a cheap, indexed aggregate over
// the whole table (never per-row / never N+1) — this is what makes the
// Priority column and Needs Attention section affordable on every list-page
// load regardless of platform size. "Requests with errors" from the brief
// has no real signal to key off (Fashion360 has no error/exception tracking
// on ServiceRequest) — see the Phase 5 report's Known Limitations rather
// than fabricating one here.
async function resolveAttentionFlags(): Promise<AttentionFlag[]> {
  const now = Date.now();
  const pendingCutoff = new Date(now - STUCK_PENDING_RESPONSE_HOURS * 60 * 60 * 1000);
  const reviewCutoff = new Date(now - STUCK_UNDER_REVIEW_DAYS * 24 * 60 * 60 * 1000);
  const cancelledCutoff = new Date(now - RECENT_CANCELLED_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [stuckPending, stuckReview, recentCancelled, revisionGroups] = await Promise.all([
    prisma.serviceRequest.findMany({
      where: { status: { in: ["SUBMITTED", "RECEIVED"] }, updatedAt: { lte: pendingCutoff } },
      select: { id: true, updatedAt: true },
    }),
    prisma.serviceRequest.findMany({
      where: { status: "UNDER_REVIEW", updatedAt: { lte: reviewCutoff } },
      select: { id: true, updatedAt: true },
    }),
    prisma.serviceRequest.findMany({
      where: { status: "CANCELLED", updatedAt: { gte: cancelledCutoff } },
      select: { id: true, updatedAt: true },
    }),
    prisma.serviceRequestResponse.groupBy({
      by: ["serviceRequestId"],
      where: { type: { in: ["INFO_REQUESTED", "ALTERNATIVE_DATE_PROPOSED"] } },
      _count: true,
      having: { serviceRequestId: { _count: { gte: REPEATED_REVISIONS_THRESHOLD } } },
    }),
  ]);

  const flags: AttentionFlag[] = [
    ...stuckPending.map((r) => ({ requestId: r.id, reason: `No response for over ${STUCK_PENDING_RESPONSE_HOURS}h`, since: r.updatedAt })),
    ...stuckReview.map((r) => ({ requestId: r.id, reason: `In review for over ${STUCK_UNDER_REVIEW_DAYS} days`, since: r.updatedAt })),
    ...recentCancelled.map((r) => ({ requestId: r.id, reason: "Recently cancelled", since: r.updatedAt })),
  ];

  if (revisionGroups.length) {
    const ids = revisionGroups.map((g) => g.serviceRequestId);
    const reqs = await prisma.serviceRequest.findMany({ where: { id: { in: ids } }, select: { id: true, updatedAt: true } });
    for (const r of reqs) flags.push({ requestId: r.id, reason: "Repeated revisions requested", since: r.updatedAt });
  }

  return flags;
}

export interface AdminRequestListParams {
  q?: string;
  status?: ServiceRequestStatus;
  service?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  needsAttention?: boolean;
  // Not exposed as their own text inputs on the form — the search box
  // already covers "search by customer/designer name" (brief #4), and a
  // second, identical-looking pair of inputs would be exactly the interface
  // overload brief #5 warns against. Instead these are set only via a
  // deep link's query string, from a "View Requests" action on a specific
  // customer's or designer's own Admin detail page.
  designerId?: string;
  customerId?: string;
  page?: number;
}

export async function getAdminRequestList(params: AdminRequestListParams) {
  const page = Math.max(1, params.page ?? 1);
  const search = params.q?.trim();

  const attentionFlags = await resolveAttentionFlags();
  const attentionByRequestId = new Map<string, AttentionFlag>();
  for (const f of attentionFlags) if (!attentionByRequestId.has(f.requestId)) attentionByRequestId.set(f.requestId, f);

  const conditions: Prisma.ServiceRequestWhereInput[] = [{ status: { not: "DRAFT" } }];
  if (search) {
    conditions.push({
      OR: [
        { id: { equals: search } },
        { requestCode: { contains: search, mode: "insensitive" } },
        { customerProfile: { user: { name: { contains: search, mode: "insensitive" } } } },
        { customerProfile: { user: { email: { contains: search, mode: "insensitive" } } } },
        { business: { name: { contains: search, mode: "insensitive" } } },
        { business: { users: { some: { name: { contains: search, mode: "insensitive" } } } } },
        { service: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }
  if (params.status) conditions.push({ status: params.status });
  if (params.service) conditions.push({ service: { is: { name: { contains: params.service, mode: "insensitive" } } } });
  if (params.location) {
    conditions.push({
      OR: [
        { locationPreference: { contains: params.location, mode: "insensitive" } },
        { business: { city: { contains: params.location, mode: "insensitive" } } },
        { business: { country: { contains: params.location, mode: "insensitive" } } },
      ],
    });
  }
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
  if (params.needsAttention) conditions.push({ id: { in: [...attentionByRequestId.keys()] } });

  const where: Prisma.ServiceRequestWhereInput = { AND: conditions };

  const [total, requests] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        requestCode: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        customerProfile: { select: { id: true, user: { select: { name: true, email: true } } } },
        business: { select: { id: true, name: true } },
        service: { select: { name: true } },
      },
    }),
  ]);

  return {
    requests: requests.map((r) => ({
      id: r.id,
      requestCode: r.requestCode,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      customerId: r.customerProfile.id,
      customerName: r.customerProfile.user.name ?? r.customerProfile.user.email,
      designerId: r.business.id,
      designerName: r.business.name,
      serviceName: r.service?.name ?? "General inquiry",
      attention: attentionByRequestId.get(r.id) ?? null,
      // A resolved request (converted, declined, cancelled, expired) isn't
      // "waiting" on anything any more — the column should read as elapsed
      // time-in-current-state only while that's still true.
      isTerminal: TERMINAL_STATUSES.includes(r.status),
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// Section 17's 8 lightweight metrics, computed from a single groupBy (never
// one count() per bucket) so this stays cheap regardless of table size.
// "Completed" maps to CONVERTED_TO_APPOINTMENT + CONVERTED_TO_ORDER — the
// request's own job (connect customer to designer and hand off to real
// work) is genuinely done at that point, even though the resulting
// order/appointment itself continues its own separate lifecycle elsewhere
// (out of scope for this phase — see brief #28). "Cancelled" folds in
// EXPIRED alongside CANCELLED: both are "the request died without a
// decision" rather than a rejection, and the brief's 8-metric list has no
// separate slot for it.
export async function getAdminRequestStats() {
  const [statusGroups, attentionFlags] = await Promise.all([prisma.serviceRequest.groupBy({ by: ["status"], _count: true }), resolveAttentionFlags()]);
  const counts = new Map(statusGroups.map((g) => [g.status, g._count]));
  const get = (s: ServiceRequestStatus) => counts.get(s) ?? 0;
  const total = [...counts.entries()].filter(([status]) => status !== "DRAFT").reduce((sum, [, count]) => sum + count, 0);
  const needsAttention = new Set(attentionFlags.map((f) => f.requestId)).size;

  return {
    total,
    pending: get("SUBMITTED") + get("RECEIVED"),
    accepted: get("ACCEPTED"),
    inProgress: get("UNDER_REVIEW"),
    completed: get("CONVERTED_TO_APPOINTMENT") + get("CONVERTED_TO_ORDER"),
    rejected: get("DECLINED"),
    cancelled: get("CANCELLED") + get("EXPIRED"),
    needsAttention,
  };
}

// The individual flagged rows for the "Needs Attention" section (#13) —
// resolveAttentionFlags() again (cheap; same handful of indexed queries),
// joined with just enough context to render each row without pulling any
// request's full detail.
export async function getRequestsNeedingAttention(limit = 10) {
  const flags = await resolveAttentionFlags();
  if (flags.length === 0) return [];

  const byRequestId = new Map<string, AttentionFlag>();
  for (const f of flags) if (!byRequestId.has(f.requestId)) byRequestId.set(f.requestId, f);

  const sorted = [...byRequestId.values()].sort((a, b) => a.since.getTime() - b.since.getTime()).slice(0, limit);
  const requests = await prisma.serviceRequest.findMany({
    where: { id: { in: sorted.map((f) => f.requestId) } },
    select: {
      id: true,
      requestCode: true,
      customerProfile: { select: { user: { select: { name: true, email: true } } } },
      business: { select: { name: true } },
    },
  });
  const requestById = new Map(requests.map((r) => [r.id, r]));

  return sorted
    .map((f) => {
      const r = requestById.get(f.requestId);
      if (!r) return null;
      return {
        requestId: r.id,
        requestCode: r.requestCode,
        customerName: r.customerProfile.user.name ?? r.customerProfile.user.email,
        designerName: r.business.name,
        reason: f.reason,
        since: f.since,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

const STATUS_HISTORY_LABELS: Record<string, string> = {
  DRAFT: "Request created",
  SUBMITTED: "Customer submitted request",
  RECEIVED: "Designer viewed request",
  UNDER_REVIEW: "Designer responded",
  ACCEPTED: "Request accepted — connection established",
  DECLINED: "Request declined",
  CANCELLED: "Request cancelled",
  EXPIRED: "Request expired",
  CONVERTED_TO_APPOINTMENT: "Converted to an appointment",
  CONVERTED_TO_ORDER: "Converted to an order",
};

const RESPONSE_LABELS: Record<string, string> = {
  MESSAGE: "sent a message",
  ACCEPTED: "accepted the request",
  DECLINED: "declined the request",
  INFO_REQUESTED: "asked for more information",
  ALTERNATIVE_DATE_PROPOSED: "proposed a different date",
  CUSTOMER_ACCEPTED: "accepted",
  CUSTOMER_DECLINED: "declined",
};

export interface RequestTimelineEvent {
  id: string;
  description: string;
  actor: string;
  timestamp: Date;
}

export async function getAdminRequestDetail(id: string) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      customerProfile: {
        select: {
          id: true,
          phone: true,
          city: true,
          state: true,
          country: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      business: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          businessType: true,
          rating: { select: { averageRating: true, totalReviews: true } },
          verification: { select: { status: true } },
        },
      },
      service: { select: { name: true } },
      attachments: true,
      responses: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!request) return null;

  const [customerOrders, customerRequests, designerOrders] = await Promise.all([
    prisma.order.findMany({
      where: { customerProfileId: request.customerProfileId, businessId: request.businessId },
      orderBy: { orderDate: "desc" },
      take: 10,
      select: { id: true, orderCode: true, status: true, totalValue: true, orderDate: true },
    }),
    prisma.serviceRequest.findMany({
      where: { customerProfileId: request.customerProfileId, businessId: request.businessId, id: { not: id } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, requestCode: true, status: true, createdAt: true },
    }),
    // The designer's own recent orders generally (not customer-scoped — that's
    // customerOrders above), for the "relevant previous orders" #8 asks for
    // under Designer Information.
    prisma.order.findMany({
      where: { businessId: request.businessId },
      orderBy: { orderDate: "desc" },
      take: 5,
      select: { id: true, orderCode: true, status: true, totalValue: true, orderDate: true },
    }),
  ]);

  const timeline: RequestTimelineEvent[] = [
    { id: "created", description: "Customer submitted request", actor: request.customerProfile.user.name ?? "Customer", timestamp: request.createdAt },
    ...request.statusHistory.map((h) => ({
      id: `status_${h.id}`,
      description: STATUS_HISTORY_LABELS[h.status] ?? h.status,
      actor: "System",
      timestamp: h.createdAt,
    })),
    ...request.responses.map((r) => ({
      id: `resp_${r.id}`,
      description: `${r.actorType === "BUSINESS" ? (r.author?.name ?? "Designer") : (request.customerProfile.user.name ?? "Customer")} ${RESPONSE_LABELS[r.type] ?? "responded"}`,
      actor: r.actorType === "BUSINESS" ? "Designer" : "Customer",
      timestamp: r.createdAt,
    })),
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const revisionCount = request.responses.filter((r) => r.type === "INFO_REQUESTED" || r.type === "ALTERNATIVE_DATE_PROPOSED").length;
  const attention = computeAttentionForRequest(request.status, request.updatedAt, revisionCount);

  return { request, timeline, customerOrders, customerRequests, designerOrders, attention, cancellable: !TERMINAL_STATUSES.includes(request.status) };
}

// Single-record counterpart of resolveAttentionFlags() above, computed in
// JS from data the detail page already loaded rather than firing the same
// aggregate queries again for one row — same thresholds, same reasons, kept
// as its own small function (rather than sharing one implementation with
// the bulk resolver) because the two run against genuinely different data
// shapes: a full table scan there vs. one already-fetched record here.
function computeAttentionForRequest(status: ServiceRequestStatus, updatedAt: Date, revisionCount: number): { reason: string; since: Date } | null {
  const elapsed = Date.now() - updatedAt.getTime();
  if ((status === "SUBMITTED" || status === "RECEIVED") && elapsed >= STUCK_PENDING_RESPONSE_HOURS * 60 * 60 * 1000) {
    return { reason: `No response for over ${STUCK_PENDING_RESPONSE_HOURS}h`, since: updatedAt };
  }
  if (status === "UNDER_REVIEW" && elapsed >= STUCK_UNDER_REVIEW_DAYS * 24 * 60 * 60 * 1000) {
    return { reason: `In review for over ${STUCK_UNDER_REVIEW_DAYS} days`, since: updatedAt };
  }
  if (status === "CANCELLED" && elapsed <= RECENT_CANCELLED_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    return { reason: "Recently cancelled", since: updatedAt };
  }
  if (revisionCount >= REPEATED_REVISIONS_THRESHOLD) {
    return { reason: "Repeated revisions requested", since: updatedAt };
  }
  return null;
}

// Compact "waiting time" duration (e.g. "2d 4h"), distinct from
// formatRelativeTime (lib/utils.ts) which reads as a past-tense sentence
// ("2 days ago") — a table column needs the bare duration, not a sentence.
export function formatDuration(from: Date, to: Date = new Date()): string {
  const ms = Math.max(0, to.getTime() - from.getTime());
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

// ===================== Admin intervention actions (#14) =====================
//
// Deliberately narrow: cancel and contact are the two interventions the
// existing architecture actually supports without inventing new machinery.
// Reassignment is NOT implemented — see the Phase 5 report's Known
// Limitations. ServiceRequest.businessId is the customer's own choice of
// designer, load-bearing everywhere (the conversation thread, notifications,
// requestCode numbering are all scoped to that one business); moving a
// request to a different business would mean either fabricating a new
// conversation with a business that never saw the original request, or
// silently rewriting who the customer talked to. That's a new product
// concept, not a "carefully controlled action" on the existing one — out of
// scope for this phase per the brief's own instruction to report the
// limitation instead of inventing a system for it.

export async function cancelRequestByAdmin(db: typeof prisma, params: { requestId: string; reason: string; actorId: string }) {
  const request = await db.serviceRequest.findUnique({ where: { id: params.requestId }, select: { id: true, status: true, businessId: true, customerProfileId: true, requestCode: true } });
  if (!request) throw new ApiError(404, "Request not found");
  if (TERMINAL_STATUSES.includes(request.status)) throw new ApiError(400, "This request has already reached a final state and can't be cancelled");

  await db.$transaction(async (tx) => {
    await tx.serviceRequest.update({ where: { id: params.requestId }, data: { status: "CANCELLED" } });
    await tx.serviceRequestStatusHistory.create({
      data: { serviceRequestId: params.requestId, status: "CANCELLED", note: `Cancelled by Fashion360 admin: ${params.reason}` },
    });
    await notifyCustomer(tx, {
      businessId: request.businessId,
      customerProfileId: request.customerProfileId,
      title: "Your request was cancelled",
      body: params.reason,
      type: "warning",
    });
    await notifyBusinessOwners(tx, {
      businessId: request.businessId,
      title: "A request was cancelled by Fashion360",
      body: `Request ${request.requestCode}: ${params.reason}`,
      type: "warning",
    });
    await logAuditEvent(tx, {
      action: "REQUEST_CANCELLED_BY_ADMIN",
      userId: params.actorId,
      businessId: request.businessId,
      entityType: "ServiceRequest",
      entityId: params.requestId,
      metadata: { reason: params.reason },
    });
  });
}

export async function contactRequestParty(db: typeof prisma, params: { requestId: string; target: "customer" | "designer"; message: string; actorId: string }) {
  const request = await db.serviceRequest.findUnique({ where: { id: params.requestId }, select: { id: true, businessId: true, customerProfileId: true } });
  if (!request) throw new ApiError(404, "Request not found");

  await db.$transaction(async (tx) => {
    if (params.target === "customer") {
      await notifyCustomer(tx, {
        businessId: request.businessId,
        customerProfileId: request.customerProfileId,
        title: "Message from Fashion360 support",
        body: params.message,
        type: "info",
      });
    } else {
      await notifyBusinessOwners(tx, {
        businessId: request.businessId,
        title: "Message from Fashion360 support",
        body: params.message,
        type: "info",
      });
    }
    await logAuditEvent(tx, {
      action: "REQUEST_CONTACT_SENT_BY_ADMIN",
      userId: params.actorId,
      businessId: request.businessId,
      entityType: "ServiceRequest",
      entityId: params.requestId,
      metadata: { target: params.target, message: params.message },
    });
  });
}
