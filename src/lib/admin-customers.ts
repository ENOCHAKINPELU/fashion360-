import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";
import { dispatchNotification } from "@/lib/notification-center";

const PAGE_SIZE = 20;
// A starting, fixed bar — there isn't yet enough platform spend volume to
// set this from a real percentile of the customer base. Revisit once
// there's a meaningful distribution to look at instead of guessing one.
const HIGH_VALUE_THRESHOLD_NGN = 100_000;
const NEW_CUSTOMER_WINDOW_DAYS = 30;

export interface AdminCustomerListParams {
  q?: string;
  status?: "active" | "suspended";
  orders?: "none" | "repeat";
  highValue?: boolean;
  newOnly?: boolean;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}

// Two of the required filters (Repeat Customers, High Value Customers) are
// genuinely aggregate conditions ("orders count >= 2", "lifetime paid >=
// threshold") that Prisma can't express as a plain `where` on
// CustomerProfile — they need a GROUP BY ... HAVING over Order first. Both
// resolve to a list of qualifying customerProfileIds, which then narrows
// the main query the same way any other filter does. Order.amountPaid
// (kept in sync elsewhere by syncOrderFinancials) is the real, already-
// trustworthy "how much has this customer actually paid" figure — no need
// to re-derive it from Payment, which isn't even linked to CustomerProfile
// directly (only through Order).
async function resolveAggregateFilterIds(params: AdminCustomerListParams): Promise<string[] | null> {
  const needsRepeat = params.orders === "repeat";
  const needsHighValue = !!params.highValue;
  if (!needsRepeat && !needsHighValue) return null;

  const [repeatGroups, highValueGroups] = await Promise.all([
    needsRepeat
      ? prisma.order.groupBy({
          by: ["customerProfileId"],
          where: { customerProfileId: { not: null } },
          _count: true,
          having: { customerProfileId: { _count: { gte: 2 } } },
        })
      : Promise.resolve(null),
    needsHighValue
      ? prisma.order.groupBy({
          by: ["customerProfileId"],
          where: { customerProfileId: { not: null } },
          _sum: { amountPaid: true },
          having: { amountPaid: { _sum: { gte: HIGH_VALUE_THRESHOLD_NGN } } },
        })
      : Promise.resolve(null),
  ]);

  const repeatIds = repeatGroups?.map((g) => g.customerProfileId!) ?? null;
  const highValueIds = highValueGroups?.map((g) => g.customerProfileId!) ?? null;

  // Both filters active at once → intersection (a repeat AND high-value customer).
  if (repeatIds && highValueIds) return repeatIds.filter((id) => highValueIds.includes(id));
  return repeatIds ?? highValueIds ?? [];
}

export async function getAdminCustomerList(params: AdminCustomerListParams) {
  const page = Math.max(1, params.page ?? 1);
  const search = params.q?.trim();

  const aggregateFilterIds = await resolveAggregateFilterIds(params);

  const conditions: Prisma.CustomerProfileWhereInput[] = [];
  if (search) {
    conditions.push({
      OR: [
        { id: { equals: search } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (params.status === "active") conditions.push({ user: { suspendedAt: null } });
  if (params.status === "suspended") conditions.push({ user: { suspendedAt: { not: null } } });
  if (params.orders === "none") conditions.push({ orders: { none: {} } });
  if (params.location) {
    conditions.push({
      OR: [
        { city: { contains: params.location, mode: "insensitive" } },
        { country: { contains: params.location, mode: "insensitive" } },
      ],
    });
  }
  if (params.newOnly) {
    conditions.push({ createdAt: { gte: new Date(Date.now() - NEW_CUSTOMER_WINDOW_DAYS * 24 * 60 * 60 * 1000) } });
  }
  if (params.dateFrom || params.dateTo) {
    conditions.push({
      createdAt: {
        ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
        ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999Z`) } : {}),
      },
    });
  }
  if (aggregateFilterIds !== null) conditions.push({ id: { in: aggregateFilterIds } });

  const where: Prisma.CustomerProfileWhereInput = conditions.length ? { AND: conditions } : {};

  const [total, customers] = await Promise.all([
    prisma.customerProfile.count({ where }),
    prisma.customerProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        phone: true,
        city: true,
        country: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, suspendedAt: true } },
        _count: { select: { orders: true, serviceRequests: true } },
      },
    }),
  ]);

  const ids = customers.map((c) => c.id);
  const userIds = customers.map((c) => c.user.id);

  // Per-page-only aggregates — never computed for the whole table, only the
  // ≤20 rows actually being shown, so this stays cheap regardless of how
  // large the customer base grows.
  const [spendGroups, lastLogins] = await Promise.all([
    ids.length
      ? prisma.order.groupBy({ by: ["customerProfileId"], where: { customerProfileId: { in: ids } }, _sum: { amountPaid: true } })
      : Promise.resolve([]),
    userIds.length
      ? prisma.auditLog.findMany({
          where: { userId: { in: userIds }, action: "USER_LOGIN" },
          orderBy: { createdAt: "desc" },
          select: { userId: true, createdAt: true },
          take: 500,
        })
      : Promise.resolve([]),
  ]);

  const spendById = new Map(spendGroups.map((g) => [g.customerProfileId, g._sum.amountPaid ?? 0]));
  const lastLoginByUserId = new Map<string, Date>();
  for (const log of lastLogins) {
    if (!lastLoginByUserId.has(log.userId!)) lastLoginByUserId.set(log.userId!, log.createdAt);
  }

  return {
    customers: customers.map((c) => ({
      id: c.id,
      name: c.user.name,
      email: c.user.email,
      phone: c.phone,
      city: c.city,
      country: c.country,
      createdAt: c.createdAt,
      orderCount: c._count.orders,
      requestCount: c._count.serviceRequests,
      totalSpend: spendById.get(c.id) ?? 0,
      suspendedAt: c.user.suspendedAt,
      lastActiveAt: lastLoginByUserId.get(c.user.id) ?? null,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function suspendCustomer(db: typeof prisma, params: { userId: string; reason: string; actorId: string }) {
  const user = await db.user.findUnique({ where: { id: params.userId }, select: { id: true, role: true, suspendedAt: true, email: true } });
  if (!user || user.role !== "CUSTOMER") throw new ApiError(404, "Customer not found");
  if (user.suspendedAt) throw new ApiError(400, "This customer is already suspended");

  await db.user.update({
    where: { id: params.userId },
    data: { suspendedAt: new Date(), suspendedReason: params.reason, suspendedById: params.actorId },
  });

  await logAuditEvent(db, {
    action: "CUSTOMER_SUSPENDED",
    userId: params.actorId,
    entityType: "User",
    entityId: params.userId,
    metadata: { reason: params.reason },
  });

  // EMAIL, not IN_APP — a suspended account is blocked from logging in
  // (see auth.ts's authorize()), so an in-app notification would never be
  // seen.
  await dispatchNotification(db, {
    event: "ACCOUNT_SUSPENDED",
    channel: "EMAIL",
    recipientUserId: user.id,
    recipientEmail: user.email,
    title: "Your Fashion360 account has been suspended",
    body: `Your account was suspended: ${params.reason}. Contact support if you believe this is a mistake.`,
  });
}

export async function reactivateCustomer(db: typeof prisma, params: { userId: string; actorId: string }) {
  const user = await db.user.findUnique({ where: { id: params.userId }, select: { id: true, role: true, suspendedAt: true } });
  if (!user || user.role !== "CUSTOMER") throw new ApiError(404, "Customer not found");
  if (!user.suspendedAt) throw new ApiError(400, "This customer is not suspended");

  await db.user.update({
    where: { id: params.userId },
    data: { suspendedAt: null, suspendedReason: null, suspendedById: null },
  });

  await logAuditEvent(db, {
    action: "CUSTOMER_REACTIVATED",
    userId: params.actorId,
    entityType: "User",
    entityId: params.userId,
  });
}

// The per-customer counterpart of lib/admin-dashboard.ts's platform-wide
// activity merge — same idea (union several real, already-timestamped
// models rather than relying solely on AuditLog, which never captured most
// of these event types), scoped to one customer instead of the whole
// platform.
export async function getCustomerActivityTimeline(customerProfileId: string, userId: string) {
  type Item = { id: string; description: string; timestamp: Date };

  const [profile, logins, requests, payments, approvals, reviews, orderCompletions] = await Promise.all([
    prisma.customerProfile.findUnique({ where: { id: customerProfileId }, select: { createdAt: true } }),
    prisma.auditLog.findMany({ where: { userId, action: "USER_LOGIN" }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, createdAt: true } }),
    prisma.serviceRequest.findMany({
      where: { customerProfileId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, requestCode: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: { order: { customerProfileId }, status: "SUCCESSFUL", paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
      take: 10,
      select: { id: true, amount: true, currency: true, paidAt: true },
    }),
    prisma.designPreview.findMany({
      where: { customerProfileId, approvedAt: { not: null } },
      orderBy: { approvedAt: "desc" },
      take: 10,
      select: { id: true, name: true, approvedAt: true },
    }),
    prisma.review.findMany({
      where: { customerProfileId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, overallRating: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { customerProfileId, status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, orderCode: true, updatedAt: true },
    }),
  ]);

  const items: Item[] = [
    ...(profile ? [{ id: "registered", description: "Registered on Fashion360", timestamp: profile.createdAt }] : []),
    ...logins.map((l) => ({ id: `login_${l.id}`, description: "Logged in", timestamp: l.createdAt })),
    ...requests.map((r) => ({ id: `req_${r.id}`, description: `Submitted request ${r.requestCode}`, timestamp: r.createdAt })),
    ...payments.map((p) => ({ id: `pay_${p.id}`, description: `Paid ${p.currency} ${p.amount.toLocaleString()}`, timestamp: p.paidAt! })),
    ...approvals.map((a) => ({ id: `apr_${a.id}`, description: `Approved design "${a.name}"`, timestamp: a.approvedAt! })),
    ...reviews.map((r) => ({ id: `rev_${r.id}`, description: `Submitted a ${r.overallRating}★ review`, timestamp: r.createdAt })),
    ...orderCompletions.map((o) => ({ id: `ord_${o.id}`, description: `Order ${o.orderCode} completed`, timestamp: o.updatedAt })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 25);

  return items;
}

export { HIGH_VALUE_THRESHOLD_NGN, NEW_CUSTOMER_WINDOW_DAYS };
