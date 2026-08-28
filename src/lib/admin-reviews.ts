import type { Prisma, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

// ============================================================================
// Admin Phase 9: Reviews, Ratings & Disputes Management (reviews half)
// ============================================================================
//
// AUDIT SUMMARY (see the phase report for the full write-up): the review
// moderation *backend* was already complete and unused by any admin page —
// lib/reviews.ts's moderateReview/resolveReviewReport/
// resolveReviewDeletionRequest already existed, already wrote a mandatory-
// reason audit trail (ReviewModeration), already recomputed reputation
// synchronously, already notified both sides. /admin/reviews existed too,
// but only as a moderation *queue* (flagged reviews + pending reports/
// deletion requests) — there was no way to browse or search every review,
// no review detail page, and no platform-wide dashboard. This file adds
// exactly that read layer; every moderation action still goes through the
// same lib/reviews.ts functions and the same two existing API routes
// (POST /api/admin/reviews/[id]/moderate, /restore) — this phase only
// added one new moderation action (FLAG) to that existing enum/route
// rather than building a parallel one.

const MIN_REVIEWS_FOR_RANKING = 3; // a business with 1-2 reviews shouldn't headline "Top Rated" or "Low Rated"
const TOP_RATED_LIMIT = 5;

export interface AdminReviewListParams {
  q?: string;
  rating?: number;
  status?: ReviewStatus;
  reported?: boolean;
  dateFrom?: string;
  dateTo?: string;
  designerId?: string;
  customerId?: string;
  page?: number;
}

export async function getAdminReviewList(params: AdminReviewListParams) {
  const page = Math.max(1, params.page ?? 1);
  const search = params.q?.trim();

  const conditions: Prisma.ReviewWhereInput[] = [];
  if (search) {
    conditions.push({
      OR: [
        { id: { equals: search } },
        { order: { orderCode: { contains: search, mode: "insensitive" } } },
        { customerProfile: { user: { name: { contains: search, mode: "insensitive" } } } },
        { customerProfile: { user: { email: { contains: search, mode: "insensitive" } } } },
        { business: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }
  if (params.rating) conditions.push({ overallRating: params.rating });
  if (params.status) conditions.push({ status: params.status });
  if (params.reported) conditions.push({ reports: { some: { status: "PENDING" } } });
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

  const where: Prisma.ReviewWhereInput = conditions.length ? { AND: conditions } : {};

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        overallRating: true,
        status: true,
        createdAt: true,
        flaggedAt: true,
        order: { select: { id: true, orderCode: true } },
        customerProfile: { select: { id: true, user: { select: { name: true, email: true } } } },
        business: { select: { id: true, name: true } },
        _count: { select: { reports: true } },
      },
    }),
  ]);

  return {
    reviews: reviews.map((r) => ({
      id: r.id,
      overallRating: r.overallRating,
      status: r.status,
      createdAt: r.createdAt,
      flagged: !!r.flaggedAt,
      reportCount: r._count.reports,
      orderId: r.order.id,
      orderCode: r.order.orderCode,
      customerId: r.customerProfile.id,
      customerName: r.customerProfile.user.name ?? r.customerProfile.user.email,
      designerId: r.business.id,
      designerName: r.business.name,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getAdminReviewDetail(id: string) {
  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      order: { select: { id: true, orderCode: true } },
      customerProfile: { select: { id: true, user: { select: { name: true, email: true } } } },
      business: { select: { id: true, name: true } },
      ratings: true,
      photos: { orderBy: { sortOrder: "asc" } },
      response: true,
      reports: { orderBy: { createdAt: "desc" }, include: { resolvedBy: { select: { name: true } } } },
      moderationActions: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  });
  return review;
}

// The brief's own 8 dashboard cards — Review + Dispute counts share one
// dashboard (/admin/reviews) per the brief's literal Summary Cards list,
// which is why this reaches into Dispute too rather than staying
// review-only. A single groupBy per model, never a count() per bucket.
export async function getAdminTrustSafetyStats() {
  const [reviewStatusGroups, ratingAgg, disputeStatusGroups, topRated, lowRated] = await Promise.all([
    prisma.review.groupBy({ by: ["status"], _count: true }),
    prisma.review.aggregate({ where: { status: "PUBLISHED" }, _avg: { overallRating: true } }),
    prisma.dispute.groupBy({ by: ["status"], _count: true }),
    prisma.businessRating.findMany({ where: { totalReviews: { gte: MIN_REVIEWS_FOR_RANKING } }, orderBy: { averageRating: "desc" }, take: TOP_RATED_LIMIT, include: { business: { select: { id: true, name: true } } } }),
    prisma.businessRating.findMany({ where: { totalReviews: { gte: MIN_REVIEWS_FOR_RANKING } }, orderBy: { averageRating: "asc" }, take: TOP_RATED_LIMIT, include: { business: { select: { id: true, name: true } } } }),
  ]);

  const reviewCounts = new Map(reviewStatusGroups.map((g) => [g.status, g._count]));
  const totalReviews = [...reviewCounts.values()].reduce((sum, c) => sum + c, 0);
  const disputeCounts = new Map(disputeStatusGroups.map((g) => [g.status, g._count]));
  const PENDING_DISPUTE_STATUSES = ["OPEN", "UNDER_REVIEW", "WAITING_FOR_CUSTOMER", "WAITING_FOR_DESIGNER", "ESCALATED"] as const;
  const pendingDisputes = PENDING_DISPUTE_STATUSES.reduce((sum, s) => sum + (disputeCounts.get(s) ?? 0), 0);
  const resolvedDisputes = (disputeCounts.get("RESOLVED") ?? 0) + (disputeCounts.get("CLOSED") ?? 0);

  return {
    totalReviews,
    averagePlatformRating: ratingAgg._avg.overallRating ?? 0,
    pendingDisputes,
    resolvedDisputes,
    flaggedReviews: reviewCounts.get("FLAGGED") ?? 0,
    hiddenReviews: reviewCounts.get("HIDDEN") ?? 0,
    topRatedDesigners: topRated.map((r) => ({ designerId: r.business.id, designerName: r.business.name, averageRating: r.averageRating, totalReviews: r.totalReviews })),
    lowRatedDesigners: lowRated.map((r) => ({ designerId: r.business.id, designerName: r.business.name, averageRating: r.averageRating, totalReviews: r.totalReviews })),
  };
}

// "Designer Ratings" (brief's own section) — shown on the business's own
// admin detail page (/admin/businesses/[id]) rather than a new URL, since
// the brief names no separate route for it and it's naturally per-designer
// context. BusinessRating (schema.prisma) already caches Average Rating
// and Total Reviews; Recent Reviews, Rating Trend, and the two percentages
// are computed live here since nothing caches them today.
export async function getDesignerRatingsSummary(businessId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [rating, ratingGroups, recentReviews, recentAgg, priorAgg] = await Promise.all([
    prisma.businessRating.findUnique({ where: { businessId } }),
    prisma.review.groupBy({ by: ["overallRating"], where: { businessId, status: "PUBLISHED" }, _count: true }),
    prisma.review.findMany({
      where: { businessId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, overallRating: true, bodyText: true, createdAt: true, customerProfile: { select: { user: { select: { name: true } } } } },
    }),
    prisma.review.aggregate({ where: { businessId, status: "PUBLISHED", createdAt: { gte: thirtyDaysAgo } }, _avg: { overallRating: true }, _count: true }),
    prisma.review.aggregate({ where: { businessId, status: "PUBLISHED", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }, _avg: { overallRating: true }, _count: true }),
  ]);

  const counts = new Map(ratingGroups.map((g) => [g.overallRating, g._count]));
  const total = rating?.totalReviews ?? 0;
  const fiveStarPct = total > 0 ? ((counts.get(5) ?? 0) / total) * 100 : 0;
  const oneStarPct = total > 0 ? ((counts.get(1) ?? 0) / total) * 100 : 0;

  const recentAvg = recentAgg._avg.overallRating;
  const priorAvg = priorAgg._avg.overallRating;
  // Only a real trend when both windows have at least one review — "up 5
  // stars from zero reviews" isn't a trend, it's an empty comparison.
  const trend: "up" | "down" | "flat" | "insufficient_data" =
    recentAgg._count === 0 || priorAgg._count === 0 ? "insufficient_data" : recentAvg! > priorAvg! + 0.05 ? "up" : recentAvg! < priorAvg! - 0.05 ? "down" : "flat";

  return {
    averageRating: rating?.averageRating ?? 0,
    totalReviews: total,
    fiveStarPct,
    oneStarPct,
    trend,
    recentAverage: recentAvg,
    priorAverage: priorAvg,
    recentReviews: recentReviews.map((r) => ({ id: r.id, rating: r.overallRating, excerpt: r.bodyText.slice(0, 140), createdAt: r.createdAt, customerName: r.customerProfile.user.name })),
  };
}

// ===================== Abuse detection =====================
//
// The brief's own five categories, each a cheap indexed aggregate — same
// "resolveAttentionFlags"/"resolveFraudSignals" idiom every prior Admin
// phase established. "Fake review patterns" reuses the real, already-
// computed trustWeight field (lib/business-rating.ts's
// computeReviewTrustWeight) rather than inventing new fraud heuristics from
// scratch; "suspicious ratings" is a real, defensible proxy (a burst of
// 5-star reviews for one business in a short window) rather than a claim
// this can prove intent.

export const REPEATED_REJECTED_REVIEWS_THRESHOLD = 2; // one customer, reviews REJECTED/HIDDEN/REMOVED by moderation
export const REPEATED_DISPUTES_THRESHOLD = 2; // one customer filing disputes
export const REPEATED_DISPUTES_AGAINST_THRESHOLD = 3; // one business disputed against
export const RATING_BURST_WINDOW_HOURS = 24;
export const RATING_BURST_THRESHOLD = 4; // 5-star reviews for one business within the window
export const LOW_TRUST_WEIGHT_THRESHOLD = 0.5;

export interface AbuseSignal {
  category: "REPEATED_ABUSIVE_REVIEWS" | "REPEATED_COMPLAINTS" | "SUSPICIOUS_RATINGS" | "FAKE_REVIEW_PATTERN" | "REPEATED_DISPUTES_AGAINST";
  subjectType: "customer" | "designer";
  subjectId: string;
  subjectLabel: string;
  reason: string;
  since: Date;
}

export async function getReviewAbuseSignals(): Promise<AbuseSignal[]> {
  const now = new Date();
  const burstCutoff = new Date(now.getTime() - RATING_BURST_WINDOW_HOURS * 60 * 60 * 1000);

  const [repeatedRejected, repeatedComplaints, ratingBursts, lowTrust, repeatedAgainst] = await Promise.all([
    prisma.review.groupBy({
      by: ["customerProfileId"],
      where: { status: { in: ["REJECTED", "HIDDEN", "REMOVED"] } },
      _count: true,
      having: { customerProfileId: { _count: { gte: REPEATED_REJECTED_REVIEWS_THRESHOLD } } },
    }),
    prisma.dispute.groupBy({
      by: ["customerProfileId"],
      where: { customerProfileId: { not: null } },
      _count: true,
      having: { customerProfileId: { _count: { gte: REPEATED_DISPUTES_THRESHOLD } } },
    }),
    prisma.review.groupBy({
      by: ["businessId"],
      where: { overallRating: 5, createdAt: { gte: burstCutoff } },
      _count: true,
      having: { businessId: { _count: { gte: RATING_BURST_THRESHOLD } } },
    }),
    prisma.review.findMany({ where: { status: "PUBLISHED", trustWeight: { lt: LOW_TRUST_WEIGHT_THRESHOLD } }, select: { id: true, businessId: true, createdAt: true, business: { select: { name: true } } }, take: 20 }),
    prisma.dispute.groupBy({ by: ["businessId"], _count: true, having: { businessId: { _count: { gte: REPEATED_DISPUTES_AGAINST_THRESHOLD } } } }),
  ]);

  const signals: AbuseSignal[] = [];

  if (repeatedRejected.length) {
    const ids = repeatedRejected.map((g) => g.customerProfileId);
    const profiles = await prisma.customerProfile.findMany({ where: { id: { in: ids } }, select: { id: true, user: { select: { name: true, email: true } }, updatedAt: true } });
    for (const p of profiles) {
      signals.push({ category: "REPEATED_ABUSIVE_REVIEWS", subjectType: "customer", subjectId: p.id, subjectLabel: p.user.name ?? p.user.email, reason: `${REPEATED_REJECTED_REVIEWS_THRESHOLD}+ reviews rejected, hidden, or removed by moderation`, since: p.updatedAt });
    }
  }

  if (repeatedComplaints.length) {
    const ids = repeatedComplaints.map((g) => g.customerProfileId).filter((id): id is string => !!id);
    const profiles = await prisma.customerProfile.findMany({ where: { id: { in: ids } }, select: { id: true, user: { select: { name: true, email: true } }, updatedAt: true } });
    for (const p of profiles) {
      signals.push({ category: "REPEATED_COMPLAINTS", subjectType: "customer", subjectId: p.id, subjectLabel: p.user.name ?? p.user.email, reason: `${REPEATED_DISPUTES_THRESHOLD}+ disputes filed`, since: p.updatedAt });
    }
  }

  if (ratingBursts.length) {
    const ids = ratingBursts.map((g) => g.businessId);
    const businesses = await prisma.business.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    for (const b of businesses) {
      signals.push({ category: "SUSPICIOUS_RATINGS", subjectType: "designer", subjectId: b.id, subjectLabel: b.name, reason: `${RATING_BURST_THRESHOLD}+ five-star reviews within ${RATING_BURST_WINDOW_HOURS}h`, since: now });
    }
  }

  for (const r of lowTrust) {
    signals.push({ category: "FAKE_REVIEW_PATTERN", subjectType: "designer", subjectId: r.businessId, subjectLabel: r.business.name, reason: `A review scored below ${LOW_TRUST_WEIGHT_THRESHOLD} trust weight`, since: r.createdAt });
  }

  if (repeatedAgainst.length) {
    const ids = repeatedAgainst.map((g) => g.businessId);
    const businesses = await prisma.business.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    for (const b of businesses) {
      signals.push({ category: "REPEATED_DISPUTES_AGAINST", subjectType: "designer", subjectId: b.id, subjectLabel: b.name, reason: `${REPEATED_DISPUTES_AGAINST_THRESHOLD}+ disputes filed against this business`, since: now });
    }
  }

  return signals;
}
