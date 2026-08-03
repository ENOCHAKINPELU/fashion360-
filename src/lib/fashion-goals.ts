import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 10: a small seeded catalog (mirrors the TrustBadge/RankingFactor
// lazy-seed pattern) — a customer can pick one of these or write free text.
export const FASHION_GOAL_DEFAULTS: { key: string; label: string; description: string }[] = [
  { key: "WEDDING_OUTFIT", label: "I need an outfit for my wedding", description: "Bridal wear, wedding guest outfits, and traditional wedding attire." },
  { key: "CORPORATE_WARDROBE", label: "I need corporate outfits", description: "Office-appropriate, professional wear." },
  { key: "WARDROBE_REFRESH", label: "I want to refresh my wardrobe", description: "A general update across categories and styles." },
  { key: "TRADITIONAL_OUTFITS", label: "I want traditional outfits", description: "Native and cultural ceremony wear." },
  { key: "EVENT_OUTFIT", label: "I need an outfit for an event", description: "Parties, birthdays, and special occasions." },
  { key: "CUSTOM", label: "Something else", description: "Describe your own fashion goal." },
];

export async function getOrCreateFashionGoalCatalog(db: Db) {
  const existing = await db.fashionGoal.findMany();
  const existingKeys = new Set(existing.map((g) => g.key));
  const missing = FASHION_GOAL_DEFAULTS.filter((d) => !existingKeys.has(d.key));
  if (missing.length > 0) {
    await db.fashionGoal.createMany({ data: missing });
    return db.fashionGoal.findMany();
  }
  return existing;
}

export async function createCustomerFashionGoal(db: Db, params: { customerProfileId: string; fashionGoalKey?: string; customText?: string; occasion?: string }) {
  let fashionGoalId: string | null = null;
  if (params.fashionGoalKey) {
    const catalog = await getOrCreateFashionGoalCatalog(db);
    const goal = catalog.find((g) => g.key === params.fashionGoalKey);
    if (!goal) throw new ApiError(400, "Unknown fashion goal");
    fashionGoalId = goal.id;
  }
  if (!fashionGoalId && !params.customText) throw new ApiError(400, "Provide a goal or describe what you're looking for");

  return db.customerFashionGoal.create({
    data: { customerProfileId: params.customerProfileId, fashionGoalId, customText: params.customText, occasion: params.occasion },
  });
}

export async function updateFashionGoalStatus(db: Db, params: { id: string; customerProfileId: string; status: "ACTIVE" | "ACHIEVED" | "DISMISSED" }) {
  const goal = await db.customerFashionGoal.findUniqueOrThrow({ where: { id: params.id } });
  if (goal.customerProfileId !== params.customerProfileId) throw new ApiError(404, "Fashion goal not found");
  return db.customerFashionGoal.update({ where: { id: params.id }, data: { status: params.status } });
}
