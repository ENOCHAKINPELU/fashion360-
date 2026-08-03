import type { Prisma, RecommendationEventType, CustomerBehaviorType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logCustomerBehavior } from "@/lib/customer-behavior";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 16/27: every recommendation card action funnels through here — it's
// simultaneously the feedback loop (DISMISS/HIDE feed the exclusion set in
// customer-behavior.ts) and the analytics log (Part 27 reads this same
// table for impressions/clicks/saves/requests/dismissals).
const EVENT_TO_BEHAVIOR: Partial<Record<RecommendationEventType, CustomerBehaviorType>> = {
  DISMISS: "RECOMMENDATION_REJECTED",
  HIDE: "DESIGN_HIDDEN",
};

export async function recordRecommendationEvent(db: Db, params: { recommendationId: string; customerProfileId: string; eventType: RecommendationEventType }) {
  const recommendation = await db.recommendation.findUniqueOrThrow({ where: { id: params.recommendationId } });
  if (recommendation.customerProfileId !== params.customerProfileId) throw new ApiError(404, "Recommendation not found");

  const event = await db.recommendationEvent.create({
    data: { recommendationId: params.recommendationId, customerProfileId: params.customerProfileId, eventType: params.eventType },
  });

  const behaviorType = EVENT_TO_BEHAVIOR[params.eventType];
  if (behaviorType) {
    await logCustomerBehavior(db, {
      customerProfileId: params.customerProfileId,
      businessId: recommendation.businessId,
      type: behaviorType,
      targetType: recommendation.type,
      targetId: recommendation.targetId,
    });
  }

  return event;
}

// Part 27: aggregate, never customer-identified when read by a business
// (see business-insights.ts) — CTR/conversion for a business's own
// recommended items.
export async function getRecommendationAnalytics(db: Db, params: { customerProfileId?: string; businessId?: string }) {
  const events = await db.recommendationEvent.findMany({
    where: {
      customerProfileId: params.customerProfileId,
      recommendation: params.businessId ? { businessId: params.businessId } : undefined,
    },
    select: { eventType: true },
  });

  const counts: Record<string, number> = {};
  for (const e of events) counts[e.eventType] = (counts[e.eventType] ?? 0) + 1;

  const impressions = counts.IMPRESSION ?? 0;
  const clicks = counts.CLICK ?? 0;
  const saves = counts.SAVE ?? 0;
  const requests = counts.REQUEST ?? 0;

  return {
    impressions,
    clicks,
    saves,
    requests,
    dismissals: counts.DISMISS ?? 0,
    hides: counts.HIDE ?? 0,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    conversionRate: impressions > 0 ? Math.round(((saves + requests) / impressions) * 1000) / 10 : 0,
  };
}
