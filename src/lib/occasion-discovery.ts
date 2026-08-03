import type { Prisma, ServiceCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { discoverableDesignWhere } from "@/lib/design-catalog-access";
import { discoverableBusinessWhere } from "@/lib/business-discovery";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 9: the customer-selectable occasion catalog, each mapped to the real
// ServiceCategory values and free-text search terms it should surface.
export const OCCASION_OPTIONS = [
  { key: "WEDDING", label: "Wedding", categories: ["WEDDING_OUTFIT", "BRIDAL_WEAR"] as ServiceCategory[], terms: ["wedding", "bridal"] },
  { key: "BIRTHDAY", label: "Birthday", categories: ["CASUAL_WEAR", "CUSTOM_CLOTHING"] as ServiceCategory[], terms: ["birthday", "party"] },
  { key: "OFFICE", label: "Office", categories: ["CORPORATE_WEAR"] as ServiceCategory[], terms: ["office", "corporate", "work"] },
  { key: "CHURCH", label: "Church", categories: ["TRADITIONAL_WEAR", "CUSTOM_CLOTHING"] as ServiceCategory[], terms: ["church", "sunday"] },
  { key: "PARTY", label: "Party", categories: ["CASUAL_WEAR", "STYLING"] as ServiceCategory[], terms: ["party", "cocktail"] },
  { key: "TRADITIONAL_CEREMONY", label: "Traditional Ceremony", categories: ["TRADITIONAL_WEAR"] as ServiceCategory[], terms: ["traditional", "native", "ceremony", "cultural"] },
  { key: "GRADUATION", label: "Graduation", categories: ["CUSTOM_CLOTHING", "STYLING"] as ServiceCategory[], terms: ["graduation", "convocation"] },
  { key: "VACATION", label: "Vacation", categories: ["CASUAL_WEAR"] as ServiceCategory[], terms: ["vacation", "holiday", "resort"] },
  { key: "CASUAL", label: "Casual", categories: ["CASUAL_WEAR"] as ServiceCategory[], terms: ["casual", "everyday"] },
] as const;

export type OccasionKey = (typeof OCCASION_OPTIONS)[number]["key"];

export function getOccasionConfig(key: string) {
  return OCCASION_OPTIONS.find((o) => o.key === key.toUpperCase());
}

// Part 9: "Customer selects WEDDING -> show Wedding Designers/Designs/
// Services/Inspiration" — a single composed read, no persistence needed
// (unlike Recommendation, this isn't customer-specific enough to need a
// feedback loop of its own).
export async function getOccasionDiscovery(db: Db, occasionKey: string, limit = 12) {
  const config = getOccasionConfig(occasionKey);
  if (!config) return null;

  const termOr: Prisma.DesignWhereInput[] = config.terms.flatMap((term) => [
    { occasion: { contains: term, mode: "insensitive" as const } },
    { name: { contains: term, mode: "insensitive" as const } },
    { tags: { some: { name: { contains: term, mode: "insensitive" as const } } } },
  ]);

  const [designs, businesses, services] = await Promise.all([
    db.design.findMany({
      where: { ...discoverableDesignWhere(), OR: termOr },
      orderBy: { viewCount: "desc" },
      take: limit,
      select: { id: true, name: true, mainImageUrl: true, basePrice: true, businessId: true, business: { select: { name: true } } },
    }),
    db.business.findMany({
      where: { ...discoverableBusinessWhere(), services: { some: { isActive: true, category: { in: config.categories } } } },
      orderBy: { ranking: { score: "desc" } },
      take: limit,
      select: {
        id: true,
        name: true,
        logoUrl: true,
        city: true,
        state: true,
        rating: { select: { averageRating: true, totalReviews: true } },
        trustBadgeAssignments: { select: { trustBadge: { select: { type: true, label: true } } } },
      },
    }),
    db.businessService.findMany({
      where: { isActive: true, category: { in: config.categories }, business: discoverableBusinessWhere() },
      take: limit,
      select: { id: true, name: true, category: true, priceMin: true, priceMax: true, businessId: true, business: { select: { name: true, logoUrl: true } } },
    }),
  ]);

  return { occasion: config, designs, businesses, services };
}
