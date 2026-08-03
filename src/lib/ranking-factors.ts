import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 17: "the exact ranking formula must be configurable... do not hard-
// code the ranking formula into the frontend." These keys and their
// starting weights are the defaults — every one is stored as a row an
// admin can edit via PUT /api/admin/ranking-factors, never as a literal
// number inside the scoring function itself.
export const RANKING_FACTOR_DEFAULTS: { key: string; weight: number; description: string }[] = [
  { key: "AVERAGE_RATING", weight: 20, description: "Overall average star rating" },
  { key: "VERIFIED_REVIEWS", weight: 12, description: "Volume of verified customer reviews" },
  { key: "COMPLETED_ORDERS", weight: 10, description: "Total completed orders" },
  { key: "RECENT_SATISFACTION", weight: 12, description: "Average rating from the last 90 days" },
  { key: "ON_TIME_DELIVERY", weight: 10, description: "Share of deliveries completed on or before the estimated date" },
  { key: "COMPLETION_RATE", weight: 8, description: "Share of orders that reach completion rather than cancellation" },
  { key: "CANCELLATION_RATE", weight: 6, description: "Inverse of the order cancellation rate" },
  { key: "DISPUTE_RATE", weight: 6, description: "Inverse of the order dispute rate" },
  { key: "RESPONSE_RATE", weight: 6, description: "Share of service requests the business responded to" },
  { key: "RESPONSE_TIME", weight: 4, description: "Inverse of average time-to-first-response" },
  { key: "PROFILE_COMPLETENESS", weight: 3, description: "How complete the public business profile is" },
  { key: "PORTFOLIO_QUALITY", weight: 2, description: "Portfolio depth signal" },
  { key: "REVIEW_RECENCY", weight: 1, description: "Share of reviews that are recent rather than stale" },
];

export async function getOrCreateRankingFactors(db: Db) {
  const existing = await db.rankingFactor.findMany();
  const existingKeys = new Set(existing.map((f) => f.key));
  const missing = RANKING_FACTOR_DEFAULTS.filter((d) => !existingKeys.has(d.key));

  if (missing.length > 0) {
    await db.rankingFactor.createMany({ data: missing.map((m) => ({ key: m.key, weight: m.weight, description: m.description })) });
    return db.rankingFactor.findMany();
  }

  return existing;
}
