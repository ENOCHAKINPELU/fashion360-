import type { Prisma, TrustBadgeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

const CATALOG: { type: TrustBadgeType; label: string; description: string }[] = [
  { type: "TOP_RATED", label: "Top Rated", description: "Consistently rated 4.5 stars or higher across at least 5 verified reviews." },
  { type: "HIGHLY_REVIEWED", label: "Highly Reviewed", description: "Has received 20 or more verified customer reviews." },
  { type: "RELIABLE_DELIVERY", label: "Reliable Delivery", description: "Delivers on or before the estimated date at least 90% of the time." },
  { type: "FAST_RESPONDER", label: "Fast Responder", description: "Responds quickly and consistently to service requests." },
  { type: "VERIFIED_BUSINESS", label: "Verified Business", description: "Identity and business details have been verified by Fashion360." },
  { type: "ESTABLISHED_DESIGNER", label: "Established Designer", description: "Has completed a substantial number of orders on Fashion360." },
  { type: "RISING_DESIGNER", label: "Rising Designer", description: "A newer business already earning strong customer feedback." },
  { type: "NEW_ON_FASHION360", label: "New on Fashion360", description: "Recently joined the platform." },
];

export async function getOrCreateTrustBadgeCatalog(db: Db) {
  const existing = await db.trustBadge.findMany();
  const existingTypes = new Set(existing.map((b) => b.type));
  const missing = CATALOG.filter((c) => !existingTypes.has(c.type));
  if (missing.length > 0) {
    await db.trustBadge.createMany({ data: missing });
    return db.trustBadge.findMany();
  }
  return existing;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000;

// Part 19/31: purely data-driven criteria, recomputed after every rating/
// ranking recompute — a badge disappears automatically the moment it's no
// longer earned. No field anywhere lets a business or admin hand-assign one.
export async function recomputeTrustBadges(db: Db, businessId: string) {
  const catalog = await getOrCreateTrustBadgeCatalog(db);
  const byType = new Map(catalog.map((b) => [b.type, b.id]));

  const [rating, ranking, business, verification] = await Promise.all([
    db.businessRating.findUnique({ where: { businessId } }),
    db.businessRanking.findUnique({ where: { businessId } }),
    db.business.findUniqueOrThrow({ where: { id: businessId }, select: { createdAt: true } }),
    db.businessVerification.findUnique({ where: { businessId }, select: { status: true } }),
  ]);
  const completedOrders = await db.order.count({ where: { businessId, status: "COMPLETED" } });

  const snapshot = (ranking?.factorsSnapshot as Record<string, { raw: number }> | null) ?? {};
  const businessAgeMs = Date.now() - business.createdAt.getTime();

  const earned = new Set<TrustBadgeType>();
  if ((rating?.averageRating ?? 0) >= 4.5 && (rating?.totalReviews ?? 0) >= 5) earned.add("TOP_RATED");
  if ((rating?.totalReviews ?? 0) >= 20) earned.add("HIGHLY_REVIEWED");
  if ((snapshot.ON_TIME_DELIVERY?.raw ?? 0) >= 0.9) earned.add("RELIABLE_DELIVERY");
  if ((snapshot.RESPONSE_TIME?.raw ?? 0) >= 0.7 && (snapshot.RESPONSE_RATE?.raw ?? 0) >= 0.8) earned.add("FAST_RESPONDER");
  if (verification?.status === "VERIFIED") earned.add("VERIFIED_BUSINESS");
  if (completedOrders >= 30) earned.add("ESTABLISHED_DESIGNER");
  if (businessAgeMs <= SIX_MONTHS_MS && (rating?.totalReviews ?? 0) >= 3 && (rating?.averageRating ?? 0) >= 4.0) earned.add("RISING_DESIGNER");
  if (businessAgeMs <= NINETY_DAYS_MS && (rating?.totalReviews ?? 0) < 3) earned.add("NEW_ON_FASHION360");

  const current = await db.trustBadgeAssignment.findMany({ where: { businessId } });
  const currentTypeById = new Map(catalog.map((b) => [b.id, b.type]));
  const toRemove = current.filter((a) => !earned.has(currentTypeById.get(a.trustBadgeId) as TrustBadgeType));
  const currentTypes = new Set(current.map((a) => currentTypeById.get(a.trustBadgeId)));
  const toAdd = Array.from(earned).filter((t) => !currentTypes.has(t));

  if (toRemove.length > 0) {
    await db.trustBadgeAssignment.deleteMany({ where: { id: { in: toRemove.map((a) => a.id) } } });
  }
  if (toAdd.length > 0) {
    await db.trustBadgeAssignment.createMany({
      data: toAdd.map((type) => ({ businessId, trustBadgeId: byType.get(type)! })),
    });
  }

  return Array.from(earned);
}
