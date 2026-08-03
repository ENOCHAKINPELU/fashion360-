import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 16 (Phase 8): rating/reviewCount now come from the real BusinessRating
// cache (see lib/business-rating.ts), maintained synchronously whenever a
// review is published/edited/removed — never a live aggregate here, and
// still never a field a business can type a number into directly.
export async function getBusinessTrustProfile(db: Db, businessId: string) {
  const [completedOrders, verification, rating] = await Promise.all([
    db.order.count({ where: { businessId, status: "COMPLETED" } }),
    db.businessVerification.findUnique({ where: { businessId } }),
    db.businessRating.findUnique({ where: { businessId } }),
  ]);

  return {
    isVerified: verification?.status === "VERIFIED",
    verificationStatus: verification?.status ?? "UNVERIFIED",
    completedOrders,
    averageRating: rating && rating.totalReviews > 0 ? rating.averageRating : (null as number | null),
    reviewCount: rating?.totalReviews ?? 0,
    verifiedReviewCount: rating?.verifiedReviewCount ?? 0,
  };
}
