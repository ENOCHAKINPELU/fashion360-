import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { discoverableDesignWhere } from "@/lib/design-catalog-access";
import { discoverableBusinessWhere } from "@/lib/business-discovery";

type Db = typeof prisma | Prisma.TransactionClient;

function norm(s: string) {
  return s.trim().toLowerCase();
}

// Part 13: "Show Me More Like This" — deterministic, not personalized, so
// it works the same for a logged-out visitor as a customer with years of
// history. Similarity = shared category/tags/colors/fabrics/designer.
export async function findSimilarDesigns(db: Db, params: { designId: string; limit?: number }) {
  const source = await db.design.findUnique({
    where: { id: params.designId },
    select: { id: true, businessId: true, categoryId: true, tags: { select: { id: true, name: true } }, colorRecommendations: true, fabricRecommendations: true, occasion: true },
  });
  if (!source) throw new ApiError(404, "Design not found");

  const limit = params.limit ?? 12;
  const tagIds = source.tags.map((t) => t.id);
  const colors = new Set(source.colorRecommendations.map(norm));
  const fabrics = new Set(source.fabricRecommendations.map(norm));

  const candidates = await db.design.findMany({
    where: {
      ...discoverableDesignWhere(),
      id: { not: source.id },
      OR: [
        source.categoryId ? { categoryId: source.categoryId } : undefined,
        tagIds.length ? { tags: { some: { id: { in: tagIds } } } } : undefined,
        { businessId: source.businessId },
        source.occasion ? { occasion: source.occasion } : undefined,
      ].filter((c): c is NonNullable<typeof c> => !!c),
    },
    take: 60,
    select: {
      id: true,
      name: true,
      mainImageUrl: true,
      basePrice: true,
      businessId: true,
      business: { select: { name: true } },
      categoryId: true,
      occasion: true,
      tags: { select: { id: true, name: true } },
      colorRecommendations: true,
      fabricRecommendations: true,
    },
  });

  const scored = candidates.map((c) => {
    let score = 0;
    if (c.categoryId && c.categoryId === source.categoryId) score += 4;
    const sharedTags = c.tags.filter((t) => tagIds.includes(t.id)).length;
    score += sharedTags * 3;
    score += c.colorRecommendations.filter((col) => colors.has(norm(col))).length * 2;
    score += c.fabricRecommendations.filter((f) => fabrics.has(norm(f))).length * 2;
    if (c.occasion && c.occasion === source.occasion) score += 2;
    if (c.businessId === source.businessId) score += 1;
    return { ...c, similarityScore: score };
  });

  return scored
    .filter((c) => c.similarityScore > 0)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

// Part 14: "Find a Designer for This Style" — designers whose
// specialties/services/portfolio match the selected design's own
// attributes, ranked by relevance then reputation.
export async function findDesignersForDesign(db: Db, params: { designId: string; limit?: number }) {
  const source = await db.design.findUnique({
    where: { id: params.designId },
    select: { id: true, businessId: true, category: { select: { name: true } }, tags: { select: { name: true } }, occasion: true },
  });
  if (!source) throw new ApiError(404, "Design not found");

  const limit = params.limit ?? 10;
  const styleTerms = new Set([source.category?.name, ...source.tags.map((t) => t.name), source.occasion].filter((v): v is string => !!v).map(norm));

  const businesses = await db.business.findMany({
    where: discoverableBusinessWhere(),
    take: 60,
    select: {
      id: true,
      name: true,
      logoUrl: true,
      city: true,
      state: true,
      specialties: { select: { name: true } },
      services: { where: { isActive: true }, select: { id: true, name: true, category: true } },
      rating: { select: { averageRating: true, totalReviews: true, verifiedReviewCount: true } },
      trustBadgeAssignments: { select: { trustBadge: { select: { type: true, label: true } } } },
      portfolioItems: { orderBy: { sortOrder: "asc" }, take: 3, select: { imageUrl: true } },
    },
  });

  const scored = businesses.map((b) => {
    let score = 0;
    for (const s of b.specialties) if (styleTerms.has(norm(s.name))) score += 3;
    for (const s of b.services) if (styleTerms.has(norm(s.category.replace(/_/g, " ")))) score += 2;
    if (b.id === source.businessId) score += 5;
    score += (b.rating?.averageRating ?? 0) * 1.5;
    return { ...b, matchScore: score };
  });

  return scored
    .filter((b) => b.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}
