import type { Prisma, ReviewRatingCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

// Part 16/17: a maintained cache (BusinessRating), recomputed synchronously
// whenever a review is published/edited/removed — never a live aggregate at
// read time. Part 17: "do not simply rely on an unweighted average" — the
// average here is weighted by each review's trustWeight (see
// computeReviewTrustWeight), not a plain mean.
export async function recomputeBusinessRating(db: Db, businessId: string) {
  const reviews = await db.review.findMany({
    where: { businessId, status: "PUBLISHED" },
    select: { overallRating: true, trustWeight: true, isVerifiedPurchase: true, createdAt: true, ratings: { select: { category: true, rating: true } } },
  });

  const totalReviews = reviews.length;
  const verifiedReviewCount = reviews.filter((r) => r.isVerifiedPurchase).length;
  const recentReviewCount = reviews.filter((r) => Date.now() - r.createdAt.getTime() <= NINETY_DAYS_MS).length;

  let averageRating = 0;
  if (totalReviews > 0) {
    const weightSum = reviews.reduce((sum, r) => sum + r.trustWeight, 0);
    const weightedSum = reviews.reduce((sum, r) => sum + r.overallRating * r.trustWeight, 0);
    averageRating = weightSum > 0 ? weightedSum / weightSum : reviews.reduce((s, r) => s + r.overallRating, 0) / totalReviews;
  }

  const categoryTotals = new Map<ReviewRatingCategory, { sum: number; count: number }>();
  for (const review of reviews) {
    for (const rating of review.ratings) {
      const entry = categoryTotals.get(rating.category) ?? { sum: 0, count: 0 };
      entry.sum += rating.rating;
      entry.count += 1;
      categoryTotals.set(rating.category, entry);
    }
  }
  const categoryAverages: Record<string, number> = {};
  for (const [category, { sum, count }] of categoryTotals) {
    categoryAverages[category] = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
  }

  return db.businessRating.upsert({
    where: { businessId },
    create: {
      businessId,
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews,
      verifiedReviewCount,
      recentReviewCount,
      categoryAverages,
    },
    update: {
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews,
      verifiedReviewCount,
      recentReviewCount,
      categoryAverages,
    },
  });
}

// Part 34: bounded [0.5, 1.5] so no single review can dominate or vanish —
// newer reviews and customers with a track record of legitimate reviews
// carry slightly more weight. Deliberately does NOT factor in order value
// (Part 34: "do not use payment amount alone as a ranking signal").
export async function computeReviewTrustWeight(db: Db, params: { customerProfileId: string; createdAt: Date }) {
  const ageDays = (Date.now() - params.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  const recencyBonus = Math.max(0, 0.3 * (1 - ageDays / 365));

  const priorReviewCount = await db.review.count({
    where: { customerProfileId: params.customerProfileId, status: "PUBLISHED" },
  });
  const historyBonus = Math.min(0.2, 0.05 * priorReviewCount);

  return Math.min(1.5, Math.max(0.5, 1 + recencyBonus + historyBonus));
}
