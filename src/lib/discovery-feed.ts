import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { discoverableDesignWhere } from "@/lib/design-catalog-access";
import { discoverableBusinessWhere } from "@/lib/business-discovery";
import { getTrendingDesigns, getTrendingDesigners } from "@/lib/trending";
import { isWardrobeItemReadyForReorder } from "@/lib/reorder";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 11/28: composed live from Recommendation + TrendScore + BusinessRating
// on every request — deliberately NOT a stored "DiscoveryFeed" model (the
// spec's literal name). A stored feed would just be a stale cache of these
// same underlying tables; the same "compute on read, don't duplicate state"
// reasoning Phase 7 used for the customer journey tracker.
export async function getDiscoveryFeed(db: Db, customerProfileId: string) {
  const profile = await db.customerProfile.findUniqueOrThrow({ where: { id: customerProfileId } });

  const [recommendedDesigns, recommendedDesigners, savedDesigns, recentlyViewed, topRatedBusinesses, recentlyAddedDesigns, wardrobeItems, trendingDesigns, trendingDesigners] =
    await Promise.all([
      db.recommendation.findMany({ where: { customerProfileId, type: "DESIGN" }, orderBy: { score: "desc" }, take: 12 }),
      db.recommendation.findMany({ where: { customerProfileId, type: "DESIGNER" }, orderBy: { score: "desc" }, take: 8 }),
      db.designFavorite.findMany({ where: { customerProfileId }, orderBy: { createdAt: "desc" }, take: 8, include: { design: { select: { id: true, name: true, mainImageUrl: true, businessId: true } } } }),
      db.customerBehaviorSignal.findMany({
        where: { customerProfileId, type: "DESIGN_VIEWED" },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { targetId: true, createdAt: true },
      }),
      db.business.findMany({
        where: { ...discoverableBusinessWhere(), rating: { totalReviews: { gt: 0 } } },
        orderBy: { rating: { averageRating: "desc" } },
        take: 8,
        select: { id: true, name: true, logoUrl: true, rating: { select: { averageRating: true, totalReviews: true } } },
      }),
      db.design.findMany({ where: discoverableDesignWhere(), orderBy: { createdAt: "desc" }, take: 8, select: { id: true, name: true, mainImageUrl: true, businessId: true, createdAt: true } }),
      db.customerWardrobeItem.findMany({ where: { customerProfileId }, orderBy: { createdAt: "desc" }, take: 6 }),
      getTrendingDesigns(db, 8),
      getTrendingDesigners(db, 6),
    ]);

  const viewedDesignIds = [...new Set(recentlyViewed.map((v) => v.targetId).filter((id): id is string => !!id))];
  const continueExploring = viewedDesignIds.length
    ? await db.design.findMany({ where: { ...discoverableDesignWhere(), id: { in: viewedDesignIds } }, select: { id: true, name: true, mainImageUrl: true, businessId: true } })
    : [];

  const readyForAnother = wardrobeItems.filter((w) => isWardrobeItemReadyForReorder(w.createdAt));

  // Enrich the raw Recommendation rows with the design/business data the
  // customer-facing cards actually render — the feed is the one place that
  // needs this join; the type-specific GET routes already do it themselves.
  const [recDesigns, recBusinesses] = await Promise.all([
    db.design.findMany({
      where: { id: { in: recommendedDesigns.map((r) => r.targetId) } },
      select: { id: true, name: true, mainImageUrl: true, basePrice: true, businessId: true, business: { select: { name: true } } },
    }),
    db.business.findMany({
      where: { id: { in: recommendedDesigners.map((r) => r.targetId) } },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        rating: { select: { averageRating: true, totalReviews: true } },
        trustBadgeAssignments: { select: { trustBadge: { select: { type: true, label: true } } } },
      },
    }),
  ]);
  const recDesignById = new Map(recDesigns.map((d) => [d.id, d]));
  const recBusinessById = new Map(recBusinesses.map((b) => [b.id, b]));

  return {
    hasLocation: !!profile.city,
    sections: {
      recommendedForYou: recommendedDesigns.map((r) => ({ id: r.id, reasonText: r.reasonText, design: recDesignById.get(r.targetId) ?? null })).filter((r) => r.design),
      designersYouMayLike: recommendedDesigners.map((r) => ({ id: r.id, reasonText: r.reasonText, business: recBusinessById.get(r.targetId) ?? null })).filter((r) => r.business),
      becauseYouSaved: savedDesigns.map((f) => f.design),
      continueExploring,
      trendingNearYou: profile.city
        ? await db.business.findMany({
            where: { ...discoverableBusinessWhere(), city: profile.city },
            orderBy: { ranking: { score: "desc" } },
            take: 8,
            select: { id: true, name: true, logoUrl: true, city: true, rating: { select: { averageRating: true, totalReviews: true } } },
          })
        : [],
      trendingDesigns,
      trendingDesigners,
      topRated: topRatedBusinesses,
      recentlyAdded: recentlyAddedDesigns,
      yourWardrobe: wardrobeItems,
      readyForAnother,
    },
  };
}
