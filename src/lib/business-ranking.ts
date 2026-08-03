import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateRankingFactors } from "@/lib/ranking-factors";
import { notifyDesignEvent } from "@/lib/design-notifications";

type Db = typeof prisma | Prisma.TransactionClient;

const RESPONSE_TIME_CEILING_HOURS = 48;
const SIGNIFICANT_RANKING_CHANGE = 5;

// Part 17/18: every factor is normalized to 0-1 before being weighted, so
// the final score is stable regardless of how the individual raw metrics
// are scaled. Part 20: this breakdown is stored (factorsSnapshot) for
// internal/admin transparency but is never sent to the public profile or
// discovery API as-is — only derived trust badges/signals are.
export async function recomputeBusinessRanking(db: Db, businessId: string) {
  const [rating, orderCounts, business, profile, portfolioCount, serviceRequests, deliveries] = await Promise.all([
    db.businessRating.findUnique({ where: { businessId } }),
    db.order.groupBy({ by: ["status"], where: { businessId }, _count: { _all: true } }),
    db.business.findUniqueOrThrow({ where: { id: businessId }, select: { logoUrl: true } }),
    db.businessProfile.findUnique({ where: { businessId }, select: { description: true } }),
    db.businessPortfolioItem.count({ where: { businessId } }),
    db.serviceRequest.findMany({ where: { businessId }, select: { createdAt: true, businessRespondedAt: true, status: true } }),
    db.delivery.findMany({ where: { businessId, status: "DELIVERED" }, select: { deliveredAt: true, estimatedDeliveryDate: true } }),
  ]);
  const specialtyCount = await db.businessSpecialty.count({ where: { businessId } });
  const verification = await db.businessVerification.findUnique({ where: { businessId }, select: { status: true } });
  const disputedOrders = await db.order.count({ where: { businessId, status: "DISPUTED" } });

  const countFor = (status: string) => orderCounts.find((c) => c.status === status)?._count._all ?? 0;
  const completedOrders = countFor("COMPLETED");
  const cancelledOrders = countFor("CANCELLED");
  const terminalOrders = completedOrders + cancelledOrders + disputedOrders;

  const averageRating = rating?.averageRating ?? 0;
  const totalReviews = rating?.totalReviews ?? 0;
  const verifiedReviewCount = rating?.verifiedReviewCount ?? 0;
  const recentReviewCount = rating?.recentReviewCount ?? 0;

  const respondedRequests = serviceRequests.filter((r) => r.businessRespondedAt);
  const responseRate = serviceRequests.length > 0 ? respondedRequests.length / serviceRequests.length : 0;
  const avgResponseHours =
    respondedRequests.length > 0
      ? respondedRequests.reduce((sum, r) => sum + (r.businessRespondedAt!.getTime() - r.createdAt.getTime()) / (60 * 60 * 1000), 0) / respondedRequests.length
      : null;

  const onTimeEligible = deliveries.filter((d) => d.deliveredAt && d.estimatedDeliveryDate);
  const onTimeCount = onTimeEligible.filter((d) => d.deliveredAt!.getTime() <= d.estimatedDeliveryDate!.getTime()).length;

  const raw: Record<string, number> = {
    AVERAGE_RATING: averageRating / 5,
    VERIFIED_REVIEWS: Math.min(1, verifiedReviewCount / 20),
    COMPLETED_ORDERS: Math.min(1, completedOrders / 50),
    RECENT_SATISFACTION: totalReviews > 0 ? averageRating / 5 : 0,
    ON_TIME_DELIVERY: onTimeEligible.length > 0 ? onTimeCount / onTimeEligible.length : 0.5,
    COMPLETION_RATE: terminalOrders > 0 ? completedOrders / terminalOrders : 0.5,
    CANCELLATION_RATE: terminalOrders > 0 ? 1 - cancelledOrders / terminalOrders : 0.5,
    DISPUTE_RATE: terminalOrders > 0 ? 1 - disputedOrders / terminalOrders : 0.5,
    RESPONSE_RATE: responseRate,
    RESPONSE_TIME: avgResponseHours === null ? 0.5 : Math.max(0, 1 - avgResponseHours / RESPONSE_TIME_CEILING_HOURS),
    PROFILE_COMPLETENESS:
      [!!profile?.description, !!business.logoUrl, portfolioCount >= 3, specialtyCount >= 1, verification?.status === "VERIFIED"].filter(Boolean).length / 5,
    PORTFOLIO_QUALITY: Math.min(1, portfolioCount / 10),
    REVIEW_RECENCY: totalReviews > 0 ? recentReviewCount / totalReviews : 0,
  };

  const factors = await getOrCreateRankingFactors(db);
  let weightedSum = 0;
  let weightTotal = 0;
  const snapshot: Record<string, { raw: number; weight: number }> = {};
  for (const factor of factors) {
    const value = raw[factor.key] ?? 0;
    weightedSum += value * factor.weight;
    weightTotal += factor.weight;
    snapshot[factor.key] = { raw: value, weight: factor.weight };
  }
  const score = weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 1000) / 10 : 0;
  const priorRanking = await db.businessRanking.findUnique({ where: { businessId }, select: { score: true } });

  const updated = await db.businessRanking.upsert({
    where: { businessId },
    create: { businessId, score, factorsSnapshot: snapshot, computedAt: new Date() },
    update: { score, factorsSnapshot: snapshot, computedAt: new Date() },
  });

  // Part 31: "ranking changes significantly" — only fires past a threshold
  // so routine recomputes (one every submitted review) don't spam the
  // business on every tiny movement.
  if (priorRanking && Math.abs(score - priorRanking.score) >= SIGNIFICANT_RANKING_CHANGE) {
    await notifyDesignEvent(db, {
      businessId,
      title: "Your ranking has changed",
      body: `Your Fashion360 ranking score moved from ${priorRanking.score.toFixed(1)} to ${score.toFixed(1)}.`,
      type: score > priorRanking.score ? "success" : "warning",
    });
  }

  return updated;
}
