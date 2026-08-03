import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

const WINDOW_DAYS = 30;

// Part 26: every number here is a COUNT or a RATE aggregated across many
// customers — nothing in this return value can be traced back to one
// customer's individual browsing/saves/wardrobe (Part 30's privacy rule).
// Businesses read this, never CustomerBehaviorSignal/Recommendation rows
// directly (those stay behind requireCustomerContext-gated routes only).
export async function getBusinessInsights(db: Db, businessId: string) {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [designViews, designSaves, portfolioViews, serviceRequests, recommendationEvents, reviewCount, avgRating] = await Promise.all([
    db.customerBehaviorSignal.count({ where: { businessId, type: "DESIGN_VIEWED", createdAt: { gte: since } } }),
    db.customerBehaviorSignal.count({ where: { businessId, type: "DESIGN_SAVED", createdAt: { gte: since } } }),
    db.customerBehaviorSignal.count({ where: { businessId, type: "PORTFOLIO_VIEWED", createdAt: { gte: since } } }),
    db.customerBehaviorSignal.count({ where: { businessId, type: "SERVICE_REQUESTED", createdAt: { gte: since } } }),
    db.recommendationEvent.groupBy({ by: ["eventType"], where: { recommendation: { businessId }, createdAt: { gte: since } }, _count: { _all: true } }),
    db.review.count({ where: { businessId, status: "PUBLISHED", createdAt: { gte: since } } }),
    db.businessRating.findUnique({ where: { businessId }, select: { averageRating: true, totalReviews: true } }),
  ]);

  const eventCounts: Record<string, number> = {};
  for (const e of recommendationEvents) eventCounts[e.eventType] = e._count._all;
  const impressions = eventCounts.IMPRESSION ?? 0;
  const clicks = eventCounts.CLICK ?? 0;
  const conversions = (eventCounts.SAVE ?? 0) + (eventCounts.REQUEST ?? 0);

  const popularServices = await db.customerBehaviorSignal.groupBy({
    by: ["targetId"],
    where: { businessId, targetType: "SERVICE", type: "SERVICE_REQUESTED", createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { targetId: "desc" } },
    take: 5,
  });
  const serviceIds = popularServices.map((s) => s.targetId).filter((id): id is string => !!id);
  const services = serviceIds.length ? await db.businessService.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } }) : [];
  const serviceNameById = new Map(services.map((s) => [s.id, s.name]));

  return {
    windowDays: WINDOW_DAYS,
    designViews,
    designSaves,
    portfolioViews,
    serviceRequests,
    recommendationImpressions: impressions,
    recommendationClicks: clicks,
    recommendationCtr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    recommendationConversionRate: impressions > 0 ? Math.round((conversions / impressions) * 1000) / 10 : 0,
    newReviews: reviewCount,
    averageRating: avgRating?.averageRating ?? 0,
    totalReviews: avgRating?.totalReviews ?? 0,
    popularServices: popularServices.map((s) => ({ name: serviceNameById.get(s.targetId as string) ?? "Unknown", requestCount: s._count._all })),
  };
}
