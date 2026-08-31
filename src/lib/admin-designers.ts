import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";
import { dispatchNotification } from "@/lib/notification-center";

const PAGE_SIZE = 20;
// Fixed, documented starting bars — same reasoning as Phase 3's high-value
// threshold: there isn't yet enough platform volume to derive these from a
// real distribution, so they're a plain, adjustable number rather than a
// guessed percentile.
const MOST_ACTIVE_ORDER_THRESHOLD = 5;
const TOP_RATED_THRESHOLD = 4.5;
const LOW_RATING_THRESHOLD = 3;

export interface AdminDesignerListParams {
  q?: string;
  verification?: "pending" | "verified" | "suspended";
  topRated?: boolean;
  mostActive?: boolean;
  noOrders?: boolean;
  lowRatings?: boolean;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}

// "Most Active" needs a real COUNT(orders) >= N, which Prisma can't express
// as a plain relation `where` (only existence via some/none/every) — same
// shape as Phase 3's Repeat Customers filter, resolved through
// GROUP BY ... HAVING on Order first rather than post-fetch filtering,
// so pagination still stays correct.
async function resolveMostActiveIds(): Promise<string[]> {
  const groups = await prisma.order.groupBy({
    by: ["businessId"],
    _count: true,
    having: { businessId: { _count: { gte: MOST_ACTIVE_ORDER_THRESHOLD } } },
  });
  return groups.map((g) => g.businessId);
}

export async function getAdminDesignerList(params: AdminDesignerListParams) {
  const page = Math.max(1, params.page ?? 1);
  const search = params.q?.trim();

  const activeIds = params.mostActive ? await resolveMostActiveIds() : null;

  const conditions: Prisma.BusinessWhereInput[] = [];
  if (search) {
    conditions.push({
      OR: [
        { id: { equals: search } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { users: { some: { name: { contains: search, mode: "insensitive" } } } },
      ],
    });
  }
  if (params.verification === "pending") conditions.push({ verification: { is: { status: "PENDING" } } });
  if (params.verification === "verified") conditions.push({ verification: { is: { status: "VERIFIED" } } });
  if (params.verification === "suspended") conditions.push({ verification: { is: { status: "SUSPENDED" } } });
  if (params.topRated) conditions.push({ rating: { is: { averageRating: { gte: TOP_RATED_THRESHOLD } } } });
  if (params.lowRatings) conditions.push({ rating: { is: { averageRating: { gt: 0, lt: LOW_RATING_THRESHOLD } } } });
  if (params.noOrders) conditions.push({ orders: { none: {} } });
  if (activeIds !== null) conditions.push({ id: { in: activeIds } });
  if (params.location) {
    conditions.push({
      OR: [{ city: { contains: params.location, mode: "insensitive" } }, { country: { contains: params.location, mode: "insensitive" } }],
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

  const where: Prisma.BusinessWhereInput = conditions.length ? { AND: conditions } : {};

  const [total, businesses] = await Promise.all([
    prisma.business.count({ where }),
    prisma.business.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        logoUrl: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        createdAt: true,
        verification: { select: { status: true } },
        rating: { select: { averageRating: true, totalReviews: true } },
        users: { where: { role: "OWNER" }, take: 1, select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
    }),
  ]);

  const ids = businesses.map((b) => b.id);
  // Every user belonging to any of this page's businesses (owner + staff)
  // — "Last Active" reflects the whole team, not just the owner, since any
  // of them logging in counts as the business being active.
  const allBusinessUsers = ids.length ? await prisma.user.findMany({ where: { businessId: { in: ids } }, select: { id: true, businessId: true } }) : [];
  const userIdsByBusiness = new Map<string, string[]>();
  for (const u of allBusinessUsers) {
    if (!u.businessId) continue;
    const list = userIdsByBusiness.get(u.businessId) ?? [];
    list.push(u.id);
    userIdsByBusiness.set(u.businessId, list);
  }
  const allUserIds = allBusinessUsers.map((u) => u.id);

  const [revenueGroups, completedGroups, lastLogins] = await Promise.all([
    ids.length ? prisma.order.groupBy({ by: ["businessId"], where: { businessId: { in: ids } }, _sum: { amountPaid: true } }) : Promise.resolve([]),
    ids.length ? prisma.order.groupBy({ by: ["businessId"], where: { businessId: { in: ids }, status: "COMPLETED" }, _count: true }) : Promise.resolve([]),
    allUserIds.length
      ? prisma.auditLog.findMany({
          where: { userId: { in: allUserIds }, action: "USER_LOGIN" },
          orderBy: { createdAt: "desc" },
          select: { userId: true, createdAt: true },
          take: 1000,
        })
      : Promise.resolve([]),
  ]);

  const revenueById = new Map(revenueGroups.map((g) => [g.businessId, g._sum.amountPaid ?? 0]));
  const completedById = new Map(completedGroups.map((g) => [g.businessId, g._count]));
  const lastLoginByUserId = new Map<string, Date>();
  for (const log of lastLogins) {
    if (!lastLoginByUserId.has(log.userId!)) lastLoginByUserId.set(log.userId!, log.createdAt);
  }

  return {
    designers: businesses.map((b) => {
      const teamIds = userIdsByBusiness.get(b.id) ?? [];
      const lastActive = teamIds.reduce<Date | null>((latest, uid) => {
        const t = lastLoginByUserId.get(uid);
        if (!t) return latest;
        return !latest || t > latest ? t : latest;
      }, null);
      return {
        id: b.id,
        businessName: b.name,
        logoUrl: b.logoUrl,
        ownerId: b.users[0]?.id ?? null,
        ownerName: b.users[0]?.name ?? null,
        email: b.email,
        phone: b.phone,
        city: b.city,
        country: b.country,
        createdAt: b.createdAt,
        verificationStatus: b.verification?.status ?? "UNVERIFIED",
        averageRating: b.rating?.averageRating ?? 0,
        totalReviews: b.rating?.totalReviews ?? 0,
        orderCount: b._count.orders,
        completedOrderCount: completedById.get(b.id) ?? 0,
        revenueGenerated: revenueById.get(b.id) ?? 0,
        lastActiveAt: lastActive,
      };
    }),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function suspendDesigner(db: typeof prisma, params: { businessId: string; reason: string; actorId: string }) {
  const verification = await db.businessVerification.findUnique({ where: { businessId: params.businessId } });
  if (!verification) throw new ApiError(404, "Designer not found");
  if (verification.status === "SUSPENDED") throw new ApiError(400, "This designer is already suspended");

  await db.businessVerification.update({
    where: { businessId: params.businessId },
    data: {
      statusBeforeSuspension: verification.status,
      status: "SUSPENDED",
      notes: params.reason,
      reviewedAt: new Date(),
      reviewedById: params.actorId,
    },
  });

  await logAuditEvent(db, {
    action: "DESIGNER_SUSPENDED",
    userId: params.actorId,
    businessId: params.businessId,
    entityType: "Business",
    entityId: params.businessId,
    metadata: { reason: params.reason },
  });

  // EMAIL, not IN_APP — a suspended business's staff logins are blocked
  // (see requireBusinessContext in rbac.ts), so an in-app notification
  // would never be seen. Every OWNER on the team gets one, not just
  // whoever happens to log in next.
  const owners = await db.user.findMany({ where: { businessId: params.businessId, role: "OWNER" }, select: { id: true, email: true } });
  await Promise.all(
    owners.map((owner) =>
      dispatchNotification(db, {
        event: "ACCOUNT_SUSPENDED",
        channel: "EMAIL",
        recipientUserId: owner.id,
        recipientEmail: owner.email,
        businessId: params.businessId,
        title: "Your Fashion360 business account has been suspended",
        body: `Your business account was suspended: ${params.reason}. Contact support if you believe this is a mistake.`,
      })
    )
  );
}

export async function reactivateDesigner(db: typeof prisma, params: { businessId: string; actorId: string }) {
  const verification = await db.businessVerification.findUnique({ where: { businessId: params.businessId } });
  if (!verification) throw new ApiError(404, "Designer not found");
  if (verification.status !== "SUSPENDED") throw new ApiError(400, "This designer is not suspended");

  await db.businessVerification.update({
    where: { businessId: params.businessId },
    data: {
      status: verification.statusBeforeSuspension ?? "UNVERIFIED",
      statusBeforeSuspension: null,
      reviewedAt: new Date(),
      reviewedById: params.actorId,
    },
  });

  await logAuditEvent(db, {
    action: "DESIGNER_REACTIVATED",
    userId: params.actorId,
    businessId: params.businessId,
    entityType: "Business",
    entityId: params.businessId,
  });
}

export async function moderatePortfolioItem(
  db: typeof prisma,
  params: { itemId: string; businessId: string; decision: "APPROVED" | "REJECTED" | "UPDATE_REQUESTED"; note?: string; actorId: string }
) {
  const item = await db.businessPortfolioItem.findUnique({ where: { id: params.itemId } });
  if (!item || item.businessId !== params.businessId) throw new ApiError(404, "Portfolio item not found");

  await db.businessPortfolioItem.update({
    where: { id: params.itemId },
    data: { status: params.decision, reviewNote: params.note ?? null, reviewedAt: new Date(), reviewedById: params.actorId },
  });

  await logAuditEvent(db, {
    action: "PORTFOLIO_ITEM_MODERATED",
    userId: params.actorId,
    businessId: params.businessId,
    entityType: "BusinessPortfolioItem",
    entityId: params.itemId,
    metadata: { decision: params.decision, note: params.note },
  });
}

// The per-designer counterpart of lib/admin-dashboard.ts / admin-customers.ts's
// activity merges — real, already-timestamped events unioned and sorted in
// JS, scoped to one business.
export async function getDesignerActivityTimeline(businessId: string) {
  type Item = { id: string; description: string; timestamp: Date };

  const [business, teamUsers, verificationEvents, acceptedRequests, completedOrders, payments, payouts, reviews] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { createdAt: true } }),
    prisma.user.findMany({ where: { businessId }, select: { id: true } }),
    prisma.auditLog.findMany({
      where: { businessId, action: { in: ["DESIGNER_SUSPENDED", "DESIGNER_REACTIVATED"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, createdAt: true },
    }),
    prisma.serviceRequestResponse.findMany({
      where: { type: "ACCEPTED", serviceRequest: { businessId } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, createdAt: true, serviceRequest: { select: { requestCode: true } } },
    }),
    prisma.order.findMany({
      where: { businessId, status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, orderCode: true, updatedAt: true },
    }),
    prisma.payment.findMany({
      where: { businessId, status: "SUCCESSFUL", paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
      take: 10,
      select: { id: true, amount: true, currency: true, paidAt: true },
    }),
    prisma.payout.findMany({
      where: { businessId, status: "PAID" },
      orderBy: { paidAt: "desc" },
      take: 10,
      select: { id: true, netAmount: true, paidAt: true },
    }),
    prisma.review.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, overallRating: true, createdAt: true },
    }),
  ]);

  const loginLogs = teamUsers.length
    ? await prisma.auditLog.findMany({
        where: { userId: { in: teamUsers.map((u) => u.id) }, action: "USER_LOGIN" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, createdAt: true },
      })
    : [];

  const items: Item[] = [
    ...(business ? [{ id: "registered", description: "Business registered on Fashion360", timestamp: business.createdAt }] : []),
    ...loginLogs.map((l) => ({ id: `login_${l.id}`, description: "Team member logged in", timestamp: l.createdAt })),
    ...verificationEvents.map((v) => ({
      id: `verif_${v.id}`,
      description: v.action === "DESIGNER_SUSPENDED" ? "Business suspended" : "Business reactivated",
      timestamp: v.createdAt,
    })),
    ...acceptedRequests.map((r) => ({ id: `req_${r.id}`, description: `Accepted request ${r.serviceRequest.requestCode}`, timestamp: r.createdAt })),
    ...completedOrders.map((o) => ({ id: `ord_${o.id}`, description: `Order ${o.orderCode} completed`, timestamp: o.updatedAt })),
    ...payments.map((p) => ({ id: `pay_${p.id}`, description: `Received payment of ${p.currency} ${p.amount.toLocaleString()}`, timestamp: p.paidAt! })),
    ...payouts.map((p) => ({ id: `payout_${p.id}`, description: `Paid out ${p.netAmount.toLocaleString()}`, timestamp: p.paidAt! })),
    ...reviews.map((r) => ({ id: `rev_${r.id}`, description: `Received a ${r.overallRating}★ review`, timestamp: r.createdAt })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 25);

  return items;
}

export { MOST_ACTIVE_ORDER_THRESHOLD, TOP_RATED_THRESHOLD, LOW_RATING_THRESHOLD };
