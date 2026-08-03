import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recomputeBusinessRating } from "@/lib/business-rating";
import { recomputeBusinessRanking } from "@/lib/business-ranking";
import { recomputeTrustBadges } from "@/lib/trust-badges";

type Db = typeof prisma | Prisma.TransactionClient;

// The single entry point every review-state-changing action calls — rating
// must be recomputed before ranking (ranking reads BusinessRating), and
// ranking before badges (several badges read the ranking factorsSnapshot).
export async function recomputeBusinessReputation(db: Db, businessId: string) {
  await recomputeBusinessRating(db, businessId);
  await recomputeBusinessRanking(db, businessId);
  await recomputeTrustBadges(db, businessId);
}
