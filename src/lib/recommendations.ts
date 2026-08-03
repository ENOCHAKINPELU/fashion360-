import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { discoverableDesignWhere } from "@/lib/design-catalog-access";
import { discoverableBusinessWhere } from "@/lib/business-discovery";
import { getExcludedTargetIds } from "@/lib/customer-behavior";
import { buildPersonalizationContext, scoreDesignForCustomer, scoreDesignerForCustomer, scoreServiceForCustomer, applyDiversity } from "@/lib/personalization-engine";

type Db = typeof prisma | Prisma.TransactionClient;

const CANDIDATE_POOL_SIZE = 60;

async function getRatingByBusinessMap(db: Db, businessIds: string[]) {
  if (businessIds.length === 0) return new Map<string, number>();
  const ratings = await db.businessRating.findMany({ where: { businessId: { in: businessIds } }, select: { businessId: true, averageRating: true } });
  return new Map(ratings.map((r) => [r.businessId, r.averageRating]));
}

// Part 19: cold start — a customer with zero explicit preferences and zero
// behavior gets top-rated/trending/new instead of a personalized (but
// meaningless) score, so the homepage is never empty.
async function coldStartDesigns(db: Db, limit: number) {
  const designs = await db.design.findMany({
    where: discoverableDesignWhere(),
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: { id: true, businessId: true },
  });
  return designs.map((d) => ({ id: d.id, businessId: d.businessId, score: 0, reasonCode: "POPULAR", reasonText: "Popular on Fashion360" }));
}

// Part 5/6: generates (and persists) the customer's current "Recommended
// For You" design set. Persisting via upsert means Part 16's feedback
// (dismiss/hide) survives across regenerations — the row is reused, not
// recreated, so its event history stays attached.
export async function generateDesignRecommendations(db: Db, customerProfileId: string, params: { limit?: number } = {}) {
  const limit = params.limit ?? 20;
  const [ctx, excluded, savedDesignIds] = await Promise.all([
    buildPersonalizationContext(db, customerProfileId),
    getExcludedTargetIds(db, { customerProfileId, targetType: "DESIGN" }),
    db.designFavorite.findMany({ where: { customerProfileId }, select: { designId: true } }),
  ]);
  const savedIds = new Set(savedDesignIds.map((f) => f.designId));

  if (!ctx.hasAnySignal) {
    const cold = await coldStartDesigns(db, limit);
    return persistRecommendations(db, customerProfileId, "DESIGN", cold);
  }

  const candidates = await db.design.findMany({
    where: { ...discoverableDesignWhere(), id: { notIn: [...excluded, ...savedIds] } },
    orderBy: { updatedAt: "desc" },
    take: CANDIDATE_POOL_SIZE,
    select: {
      id: true,
      businessId: true,
      name: true,
      basePrice: true,
      occasion: true,
      createdAt: true,
      viewCount: true,
      category: { select: { name: true } },
      tags: { select: { name: true } },
      colorRecommendations: true,
      fabricRecommendations: true,
    },
  });

  const ratingByBusiness = await getRatingByBusinessMap(db, [...new Set(candidates.map((c) => c.businessId))]);
  const scored = candidates
    .map((design) => ({ id: design.id, businessId: design.businessId, ...scoreDesignForCustomer(design, ctx, ratingByBusiness) }))
    .sort((a, b) => b.score - a.score);

  const diversified = applyDiversity(scored, limit);
  return persistRecommendations(db, customerProfileId, "DESIGN", diversified);
}

// Part 7: "Designers You May Like."
export async function generateDesignerRecommendations(db: Db, customerProfileId: string, params: { limit?: number } = {}) {
  const limit = params.limit ?? 12;
  const ctx = await buildPersonalizationContext(db, customerProfileId);

  const candidates = await db.business.findMany({
    where: discoverableBusinessWhere(),
    take: CANDIDATE_POOL_SIZE,
    select: {
      id: true,
      city: true,
      state: true,
      specialties: { select: { name: true } },
      services: { where: { isActive: true }, select: { category: true } },
      rating: { select: { averageRating: true, totalReviews: true } },
    },
  });

  if (!ctx.hasAnySignal) {
    const top = candidates
      .slice()
      .sort((a, b) => (b.rating?.averageRating ?? 0) - (a.rating?.averageRating ?? 0))
      .slice(0, limit)
      .map((b) => ({ id: b.id, businessId: b.id, score: 0, reasonCode: "TOP_RATED", reasonText: "Top rated on Fashion360" }));
    return persistRecommendations(db, customerProfileId, "DESIGNER", top);
  }

  const scored = candidates
    .map((business) => ({ id: business.id, businessId: business.id, ...scoreDesignerForCustomer(business, ctx) }))
    .sort((a, b) => b.score - a.score);

  const diversified = applyDiversity(scored, limit);
  return persistRecommendations(db, customerProfileId, "DESIGNER", diversified);
}

// Part 8: "Services You May Need."
export async function generateServiceRecommendations(db: Db, customerProfileId: string, params: { limit?: number } = {}) {
  const limit = params.limit ?? 10;
  const ctx = await buildPersonalizationContext(db, customerProfileId);

  const candidates = await db.businessService.findMany({
    where: { isActive: true, business: discoverableBusinessWhere() },
    take: CANDIDATE_POOL_SIZE,
    select: { id: true, category: true, businessId: true },
  });
  const ratingByBusiness = await getRatingByBusinessMap(db, [...new Set(candidates.map((c) => c.businessId))]);

  const scored = candidates
    .map((service) => ({ id: service.id, businessId: service.businessId, ...scoreServiceForCustomer(service, ctx, ratingByBusiness) }))
    .sort((a, b) => b.score - a.score);

  const diversified = applyDiversity(scored, limit);
  return persistRecommendations(db, customerProfileId, "SERVICE", diversified);
}

async function persistRecommendations(
  db: Db,
  customerProfileId: string,
  type: "DESIGN" | "DESIGNER" | "SERVICE",
  scored: { id: string; businessId: string | null; score: number; reasonCode: string; reasonText: string }[]
) {
  const rows = await Promise.all(
    scored.map((s) =>
      db.recommendation.upsert({
        where: { customerProfileId_type_targetId: { customerProfileId, type, targetId: s.id } },
        create: { customerProfileId, type, targetId: s.id, businessId: s.businessId, score: s.score, reasonCode: s.reasonCode, reasonText: s.reasonText },
        update: { businessId: s.businessId, score: s.score, reasonCode: s.reasonCode, reasonText: s.reasonText, generatedAt: new Date() },
      })
    )
  );
  return rows.sort((a, b) => b.score - a.score);
}
