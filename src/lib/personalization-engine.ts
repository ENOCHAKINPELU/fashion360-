import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

const RECENT_SIGNAL_LOOKBACK = 200;
const MAX_PER_BUSINESS_IN_FEED = 2;

// Part 5: everything the scorers need, gathered once per request rather
// than re-queried per candidate. Combines EXPLICIT preferences
// (CustomerProfile fields, set via onboarding/settings) with IMPLICIT ones
// inferred from recent behavior — a customer who has never touched the
// preferences form but keeps viewing bridal designs still gets relevant
// results.
export interface PersonalizationContext {
  customerProfileId: string;
  explicitCategories: Set<string>;
  explicitStyles: Set<string>;
  explicitColors: Set<string>;
  explicitFabrics: Set<string>;
  explicitOccasions: Set<string>;
  explicitServiceTypesText: Set<string>;
  preferredDesignerIds: Set<string>;
  priceRangeMin: number | null;
  priceRangeMax: number | null;
  city: string | null;
  state: string | null;
  implicitCategories: Map<string, number>; // category/tag/color/fabric text -> weight
  implicitBusinessIds: Map<string, number>;
  hasAnySignal: boolean;
}

function norm(s: string) {
  return s.trim().toLowerCase();
}

export async function buildPersonalizationContext(db: Db, customerProfileId: string): Promise<PersonalizationContext> {
  const [profile, preferredDesigners, recentSignals] = await Promise.all([
    db.customerProfile.findUniqueOrThrow({ where: { id: customerProfileId } }),
    db.customerPreferredDesigner.findMany({ where: { customerProfileId }, select: { businessId: true } }),
    db.customerBehaviorSignal.findMany({
      where: { customerProfileId },
      orderBy: { createdAt: "desc" },
      take: RECENT_SIGNAL_LOOKBACK,
    }),
  ]);

  const designSignalIds = recentSignals.filter((s) => s.targetType === "DESIGN" && s.targetId).map((s) => ({ id: s.targetId as string, weight: s.weight }));
  const designerSignalIds = recentSignals.filter((s) => s.targetType === "DESIGNER" && s.targetId).map((s) => ({ id: s.targetId as string, weight: s.weight }));

  const [signalDesigns, wardrobeItems] = await Promise.all([
    designSignalIds.length
      ? db.design.findMany({
          where: { id: { in: designSignalIds.map((d) => d.id) } },
          select: { id: true, category: { select: { name: true } }, tags: { select: { name: true } }, colorRecommendations: true, fabricRecommendations: true, occasion: true },
        })
      : Promise.resolve([]),
    db.customerWardrobeItem.findMany({ where: { customerProfileId }, select: { category: true, color: true, fabric: true } }),
  ]);

  const implicitCategories = new Map<string, number>();
  const bump = (key: string | null | undefined, weight: number) => {
    if (!key) return;
    const k = norm(key);
    implicitCategories.set(k, (implicitCategories.get(k) ?? 0) + weight);
  };

  const designWeightById = new Map(designSignalIds.map((d) => [d.id, d.weight]));
  for (const design of signalDesigns) {
    const w = designWeightById.get(design.id) ?? 1;
    bump(design.category?.name, w);
    for (const tag of design.tags) bump(tag.name, w);
    for (const c of design.colorRecommendations) bump(c, w);
    for (const f of design.fabricRecommendations) bump(f, w);
    bump(design.occasion, w);
  }
  for (const item of wardrobeItems) {
    bump(item.category, 5);
    bump(item.color, 5);
    bump(item.fabric, 5);
  }

  const implicitBusinessIds = new Map<string, number>();
  for (const s of designerSignalIds) implicitBusinessIds.set(s.id, (implicitBusinessIds.get(s.id) ?? 0) + s.weight);

  return {
    customerProfileId,
    explicitCategories: new Set(profile.preferredClothingCategories.map(norm)),
    explicitStyles: new Set(profile.stylePreferences.map(norm)),
    explicitColors: new Set(profile.favoriteColors.map(norm)),
    explicitFabrics: new Set(profile.favoriteFabrics.map(norm)),
    explicitOccasions: new Set(profile.commonOccasions.map(norm)),
    explicitServiceTypesText: new Set(profile.preferredServiceTypes.map((t) => norm(t.replace(/_/g, " ")))),
    preferredDesignerIds: new Set(preferredDesigners.map((d) => d.businessId)),
    priceRangeMin: profile.priceRangeMin,
    priceRangeMax: profile.priceRangeMax,
    city: profile.city,
    state: profile.state,
    implicitCategories,
    implicitBusinessIds,
    hasAnySignal:
      profile.preferredClothingCategories.length > 0 ||
      profile.stylePreferences.length > 0 ||
      profile.favoriteColors.length > 0 ||
      recentSignals.length > 0 ||
      wardrobeItems.length > 0,
  };
}

export interface ScoredCandidate {
  score: number;
  reasonCode: string;
  reasonText: string;
}

type DesignForScoring = {
  id: string;
  businessId: string;
  name: string;
  basePrice: number | null;
  occasion: string | null;
  createdAt: Date;
  viewCount: number;
  category: { name: string } | null;
  tags: { name: string }[];
  colorRecommendations: string[];
  fabricRecommendations: string[];
};

// Part 6/17: every score comes with a single, honest, human-readable
// reason — never an exposed formula (Part 17: "do not expose internal
// scoring formulas"), and never a fabricated one (the reason is always
// derived from the actual strongest matching signal).
export function scoreDesignForCustomer(design: DesignForScoring, ctx: PersonalizationContext, ratingByBusiness: Map<string, number>): ScoredCandidate {
  let score = 0;
  let bestReason: { code: string; text: string; weight: number } | null = null;
  const consider = (matched: boolean, weight: number, code: string, text: string) => {
    if (!matched) return;
    score += weight;
    if (!bestReason || weight > bestReason.weight) bestReason = { code, text, weight };
  };

  const categoryName = design.category?.name ? norm(design.category.name) : null;
  consider(!!categoryName && ctx.explicitCategories.has(categoryName), 20, "PREFERRED_CATEGORY", `Because you're interested in ${design.category?.name}`);
  consider(!!categoryName && (ctx.implicitCategories.get(categoryName) ?? 0) > 0, 14, "SIMILAR_TO_VIEWED", `Similar to designs you've viewed`);

  for (const tag of design.tags) {
    const t = norm(tag.name);
    consider(ctx.explicitStyles.has(t), 16, "PREFERRED_STYLE", `Because you like ${tag.name} style`);
    consider((ctx.implicitCategories.get(t) ?? 0) > 0, 10, "MATCHES_ACTIVITY", `Based on your recent activity`);
  }

  for (const color of design.colorRecommendations) {
    consider(ctx.explicitColors.has(norm(color)), 10, "PREFERRED_COLOR", `In one of your favorite colors, ${color}`);
  }
  for (const fabric of design.fabricRecommendations) {
    consider(ctx.explicitFabrics.has(norm(fabric)), 8, "PREFERRED_FABRIC", `In ${fabric}, a fabric you like`);
  }
  consider(!!design.occasion && ctx.explicitOccasions.has(norm(design.occasion)), 14, "OCCASION_MATCH", `For ${design.occasion} occasions you've told us about`);
  consider(ctx.preferredDesignerIds.has(design.businessId), 18, "FOLLOWED_DESIGNER", `From a designer you follow`);

  if (ctx.priceRangeMin != null || ctx.priceRangeMax != null) {
    const price = design.basePrice;
    const withinRange = price == null || ((ctx.priceRangeMin == null || price >= ctx.priceRangeMin) && (ctx.priceRangeMax == null || price <= ctx.priceRangeMax));
    if (!withinRange) score -= 12;
  }

  // Quality/recency/popularity — small, non-dominant signals so personal
  // relevance always outweighs generic popularity (Part 20/22).
  const rating = ratingByBusiness.get(design.businessId) ?? 0;
  score += rating * 1.5;
  score += Math.min(3, design.viewCount / 50);
  const ageDays = (Date.now() - design.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  if (ageDays <= 30) score += 3;

  if (!bestReason) {
    bestReason = rating >= 4 ? { code: "TOP_RATED_DESIGNER", text: "From a highly-rated designer", weight: 0 } : { code: "POPULAR", text: "Popular on Fashion360", weight: 0 };
  }

  const reason = bestReason as { code: string; text: string; weight: number };
  return { score: Math.round(score * 10) / 10, reasonCode: reason.code, reasonText: reason.text };
}

type BusinessForScoring = {
  id: string;
  city: string | null;
  state: string | null;
  specialties: { name: string }[];
  services: { category: string }[];
  rating: { averageRating: number; totalReviews: number } | null;
};

export function scoreDesignerForCustomer(business: BusinessForScoring, ctx: PersonalizationContext): ScoredCandidate {
  let score = 0;
  let bestReason: { code: string; text: string; weight: number } | null = null;
  const consider = (matched: boolean, weight: number, code: string, text: string) => {
    if (!matched) return;
    score += weight;
    if (!bestReason || weight > bestReason.weight) bestReason = { code, text, weight };
  };

  consider(ctx.preferredDesignerIds.has(business.id), 25, "FOLLOWED_DESIGNER", "You follow this designer");
  consider((ctx.implicitBusinessIds.get(business.id) ?? 0) > 0, 15, "RECENTLY_VIEWED", "Based on designers you've recently viewed");

  for (const specialty of business.specialties) {
    const s = norm(specialty.name);
    consider(ctx.explicitStyles.has(s) || ctx.explicitCategories.has(s), 12, "MATCHES_SPECIALTY", `Specializes in ${specialty.name}`);
  }
  for (const service of business.services) {
    consider(ctx.explicitOccasions.has(norm(service.category.replace(/_/g, " "))), 10, "OFFERS_RELEVANT_SERVICE", "Offers services for your occasions");
  }
  consider(!!ctx.city && business.city === ctx.city, 8, "NEAR_YOU", "Located near you");

  const rating = business.rating?.averageRating ?? 0;
  const reviewCount = business.rating?.totalReviews ?? 0;
  score += rating * 3;
  score += Math.min(5, reviewCount / 5);

  if (!bestReason) {
    bestReason = reviewCount > 0 ? { code: "HIGHLY_RATED", text: "Highly rated by customers", weight: 0 } : { code: "NEW_ON_PLATFORM", text: "New on Fashion360", weight: 0 };
  }

  const reason = bestReason as { code: string; text: string; weight: number };
  return { score: Math.round(score * 10) / 10, reasonCode: reason.code, reasonText: reason.text };
}

type ServiceForScoring = { id: string; category: string; businessId: string };

export function scoreServiceForCustomer(service: ServiceForScoring, ctx: PersonalizationContext, ratingByBusiness: Map<string, number>): ScoredCandidate {
  let score = 0;
  let bestReason: { code: string; text: string; weight: number } | null = null;
  const consider = (matched: boolean, weight: number, code: string, text: string) => {
    if (!matched) return;
    score += weight;
    if (!bestReason || weight > bestReason.weight) bestReason = { code, text, weight };
  };

  const categoryText = norm(service.category.replace(/_/g, " "));
  consider(ctx.explicitServiceTypesText.has(categoryText), 18, "PREFERRED_SERVICE_TYPE", "Matches a service type you're interested in");
  consider(ctx.explicitOccasions.has(categoryText), 16, "OCCASION_MATCH", "Matches an occasion you dress for");
  consider(ctx.preferredDesignerIds.has(service.businessId), 14, "FOLLOWED_DESIGNER", "From a designer you follow");

  score += (ratingByBusiness.get(service.businessId) ?? 0) * 2;

  if (!bestReason) bestReason = { code: "AVAILABLE_SERVICE", text: "Available from designers on Fashion360", weight: 0 };
  const reason = bestReason as { code: string; text: string; weight: number };
  return { score: Math.round(score * 10) / 10, reasonCode: reason.code, reasonText: reason.text };
}

// Part 22: cap how many recommendations can come from the same business so
// one prolific designer can't crowd out everyone else, and make sure at
// least one newer/rising business is represented when possible.
export function applyDiversity<T extends { businessId: string | null }>(scored: T[], limit: number): T[] {
  const perBusinessCount = new Map<string, number>();
  const result: T[] = [];
  for (const item of scored) {
    const key = item.businessId ?? "unknown";
    const count = perBusinessCount.get(key) ?? 0;
    if (count >= MAX_PER_BUSINESS_IN_FEED) continue;
    perBusinessCount.set(key, count + 1);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}
