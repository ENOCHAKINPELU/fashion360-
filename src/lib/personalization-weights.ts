import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 4: "Completed Order > Saved Design > Viewed Design" — relative
// magnitudes only, never hard-coded into the scoring function (see
// getBehaviorWeights below); an admin can retune these via
// PUT /api/admin/personalization-weights without a deploy.
export const PERSONALIZATION_WEIGHT_DEFAULTS: { key: string; weight: number; description: string }[] = [
  { key: "ORDER_COMPLETED", weight: 10, description: "Customer completed an order" },
  { key: "DESIGN_REORDERED", weight: 9, description: "Customer reordered a design" },
  { key: "REVIEW_SUBMITTED", weight: 8, description: "Customer left a review" },
  { key: "WARDROBE_ADDED", weight: 7, description: "A garment was added to the customer's wardrobe" },
  { key: "DESIGN_SAVED", weight: 6, description: "Customer saved a design" },
  { key: "DESIGNER_SAVED", weight: 6, description: "Customer saved a designer" },
  { key: "SERVICE_REQUESTED", weight: 5, description: "Customer requested a service" },
  { key: "SIMILAR_DESIGN_REQUESTED", weight: 4, description: "Customer asked for similar designs" },
  { key: "PORTFOLIO_VIEWED", weight: 2, description: "Customer viewed a business portfolio" },
  { key: "DESIGNER_VIEWED", weight: 2, description: "Customer viewed a designer profile" },
  { key: "SERVICE_VIEWED", weight: 1.5, description: "Customer viewed a service" },
  { key: "DESIGN_VIEWED", weight: 1, description: "Customer viewed a design" },
  { key: "SEARCH_PERFORMED", weight: 0.5, description: "Customer performed a search" },
  { key: "DESIGN_UNSAVED", weight: -6, description: "Customer removed a design from saved" },
  { key: "DESIGNER_UNSAVED", weight: -6, description: "Customer removed a designer from saved" },
  { key: "DESIGN_HIDDEN", weight: -8, description: "Customer hid a design" },
  { key: "RECOMMENDATION_REJECTED", weight: -8, description: "Customer marked a recommendation not interested" },
];

export async function getOrCreatePersonalizationWeights(db: Db) {
  const existing = await db.personalizationWeight.findMany();
  const existingKeys = new Set(existing.map((w) => w.key));
  const missing = PERSONALIZATION_WEIGHT_DEFAULTS.filter((d) => !existingKeys.has(d.key));

  if (missing.length > 0) {
    await db.personalizationWeight.createMany({ data: missing.map((m) => ({ key: m.key, weight: m.weight, description: m.description })) });
    return db.personalizationWeight.findMany();
  }

  return existing;
}

export async function getBehaviorWeightMap(db: Db): Promise<Record<string, number>> {
  const weights = await getOrCreatePersonalizationWeights(db);
  return Object.fromEntries(weights.map((w) => [w.key, w.weight]));
}
