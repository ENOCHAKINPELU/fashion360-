import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { discoverableBusinessWhere } from "@/lib/business-discovery";
import { recomputeBusinessReputation } from "@/lib/reputation-recompute";

const PAGE_SIZE = 12;
const BACKFILL_LIMIT = 25;

// A business only gets a BusinessRanking/BusinessRating row once
// recomputeBusinessReputation runs for it (Phase 8 events: a review,
// moderation, etc.). A brand-new business with zero reviews may never have
// triggered that yet — rather than let it sort unpredictably (NULL
// ordering is DB-default-dependent), lazily backfill a handful of missing
// rows per request, the same "no cron, compute on read" pattern Phase 7
// used for releaseIfWindowExpired.
export async function backfillMissingReputationRows(where: Prisma.BusinessWhereInput) {
  const missing = await prisma.business.findMany({
    where: { ...where, ranking: null },
    select: { id: true },
    take: BACKFILL_LIMIT,
  });
  for (const business of missing) {
    await recomputeBusinessReputation(prisma, business.id);
  }
}

const RANKED_BUSINESS_SELECT = {
  id: true,
  name: true,
  logoUrl: true,
  city: true,
  state: true,
  profile: { select: { username: true, description: true } },
  rating: { select: { averageRating: true, totalReviews: true, verifiedReviewCount: true } },
  trustBadgeAssignments: { select: { trustBadge: { select: { type: true, label: true } } } },
} satisfies Prisma.BusinessSelect;

// Part 21: shared by every /discovery/* endpoint so "ranked", "top rated",
// "rising", and "reliable" all apply the exact same discoverability gate
// (discoverableBusinessWhere) — they only differ in extra where-clauses and
// sort order.
export async function getRankedBusinesses(params: { extraWhere?: Prisma.BusinessWhereInput; orderBy?: Prisma.BusinessOrderByWithRelationInput; page?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const baseWhere = discoverableBusinessWhere();
  await backfillMissingReputationRows(baseWhere);

  const where: Prisma.BusinessWhereInput = { ...baseWhere, ...(params.extraWhere ?? {}) };
  const orderBy = params.orderBy ?? { ranking: { score: "desc" } };

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: RANKED_BUSINESS_SELECT }),
    prisma.business.count({ where }),
  ]);

  return { businesses, pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) } };
}
