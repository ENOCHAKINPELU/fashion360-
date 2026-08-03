import type { Prisma, TrendEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { discoverableDesignWhere } from "@/lib/design-catalog-access";
import { discoverableBusinessWhere } from "@/lib/business-discovery";

type Db = typeof prisma | Prisma.TransactionClient;

const WINDOW_DAYS = 7;
const STALE_MS = 60 * 60 * 1000; // 1 hour — lazy recompute, same "no cron" pattern as Phase 7/8.

// Part 23: trend score is purely a function of real, recent customer
// behavior (CustomerBehaviorSignal) — a business has no field anywhere it
// can edit to move its own trend score, the same non-manipulable guarantee
// Phase 8's trust badges use.
async function recomputeTrendScores(db: Db, entityType: TrendEntityType, targetType: "DESIGN" | "DESIGNER") {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const signals = await db.customerBehaviorSignal.groupBy({
    by: ["targetId"],
    where: { targetType, targetId: { not: null }, createdAt: { gte: since } },
    _sum: { weight: true },
  });

  const targetIds = signals.map((s) => s.targetId).filter((id): id is string => !!id);
  if (targetIds.length === 0) return;

  const businessByTarget = new Map<string, string>();
  if (targetType === "DESIGN") {
    const designs = await db.design.findMany({ where: { id: { in: targetIds } }, select: { id: true, businessId: true } });
    for (const d of designs) businessByTarget.set(d.id, d.businessId);
  } else {
    for (const id of targetIds) businessByTarget.set(id, id);
  }

  await Promise.all(
    signals.map((s) => {
      const targetId = s.targetId as string;
      const score = s._sum.weight ?? 0;
      return db.trendScore.upsert({
        where: { entityType_entityId: { entityType, entityId: targetId } },
        create: { entityType, entityId: targetId, businessId: businessByTarget.get(targetId), score, windowDays: WINDOW_DAYS, computedAt: new Date() },
        update: { score, businessId: businessByTarget.get(targetId), computedAt: new Date() },
      });
    })
  );
}

async function ensureFreshTrendScores(db: Db, entityType: TrendEntityType, targetType: "DESIGN" | "DESIGNER") {
  const mostRecent = await db.trendScore.findFirst({ where: { entityType }, orderBy: { computedAt: "desc" }, select: { computedAt: true } });
  if (!mostRecent || Date.now() - mostRecent.computedAt.getTime() > STALE_MS) {
    await recomputeTrendScores(db, entityType, targetType);
  }
}

export async function getTrendingDesigns(db: Db, limit = 12) {
  await ensureFreshTrendScores(db, "DESIGN", "DESIGN");
  const trends = await db.trendScore.findMany({ where: { entityType: "DESIGN", score: { gt: 0 } }, orderBy: { score: "desc" }, take: limit * 2 });
  const designs = await db.design.findMany({
    where: { ...discoverableDesignWhere(), id: { in: trends.map((t) => t.entityId) } },
    select: { id: true, name: true, mainImageUrl: true, basePrice: true, businessId: true, business: { select: { name: true } } },
  });
  const scoreById = new Map(trends.map((t) => [t.entityId, t.score]));
  return designs
    .map((d) => ({ ...d, trendScore: scoreById.get(d.id) ?? 0 }))
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, limit);
}

export async function getTrendingDesigners(db: Db, limit = 12) {
  await ensureFreshTrendScores(db, "DESIGNER", "DESIGNER");
  const trends = await db.trendScore.findMany({ where: { entityType: "DESIGNER", score: { gt: 0 } }, orderBy: { score: "desc" }, take: limit * 2 });
  const businesses = await db.business.findMany({
    where: { ...discoverableBusinessWhere(), id: { in: trends.map((t) => t.entityId) } },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      city: true,
      state: true,
      rating: { select: { averageRating: true, totalReviews: true } },
      trustBadgeAssignments: { select: { trustBadge: { select: { type: true, label: true } } } },
    },
  });
  const scoreById = new Map(trends.map((t) => [t.entityId, t.score]));
  return businesses
    .map((b) => ({ ...b, trendScore: scoreById.get(b.id) ?? 0 }))
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, limit);
}

// Part 23: "Popular Services" — simplest honest signal available (active
// SERVICE_REQUESTED behavior in the window) without needing a parallel
// TrendScore bucket for a third entity type.
export async function getPopularServices(db: Db, limit = 10) {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const signals = await db.customerBehaviorSignal.groupBy({
    by: ["targetId"],
    where: { targetType: "SERVICE", targetId: { not: null }, type: "SERVICE_REQUESTED", createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { targetId: "desc" } },
    take: limit,
  });
  const serviceIds = signals.map((s) => s.targetId).filter((id): id is string => !!id);
  if (serviceIds.length === 0) return [];

  const services = await db.businessService.findMany({
    where: { id: { in: serviceIds }, business: discoverableBusinessWhere() },
    select: { id: true, name: true, category: true, businessId: true, business: { select: { name: true, logoUrl: true } } },
  });
  const countById = new Map(signals.map((s) => [s.targetId, s._count._all]));
  return services.map((s) => ({ ...s, requestCount: countById.get(s.id) ?? 0 })).sort((a, b) => b.requestCount - a.requestCount);
}
