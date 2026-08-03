import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 25: lazily created with honest defaults, same pattern as
// PlatformSettings/BusinessDiscoverySettings.
export async function getOrCreatePersonalizationSettings(db: Db, customerProfileId: string) {
  const existing = await db.personalizationSettings.findUnique({ where: { customerProfileId } });
  if (existing) return existing;
  return db.personalizationSettings.create({ data: { customerProfileId } });
}

export async function updatePersonalizationSettings(
  db: Db,
  customerProfileId: string,
  data: Partial<{
    personalizationEnabled: boolean;
    locationDiscoveryEnabled: boolean;
    notifyNewDesignsFromSaved: boolean;
    notifyStyleMatches: boolean;
    notifySavedDesignerServices: boolean;
  }>
) {
  await getOrCreatePersonalizationSettings(db, customerProfileId);
  return db.personalizationSettings.update({ where: { customerProfileId }, data });
}

// Part 25: "Clear Recommendation History" / "Delete Activity History" /
// "Reset Preferences" — real deletes, not soft flags, since these are
// explicit data-control requests, not moderation actions that need an
// audit trail.
export async function clearRecommendationHistory(db: Db, customerProfileId: string) {
  await db.recommendation.deleteMany({ where: { customerProfileId } });
}

export async function deleteActivityHistory(db: Db, customerProfileId: string) {
  await db.customerBehaviorSignal.deleteMany({ where: { customerProfileId } });
}

export async function resetPreferences(db: Db, customerProfileId: string) {
  await db.customerProfile.update({
    where: { id: customerProfileId },
    data: {
      favoriteColors: [],
      favoriteFabrics: [],
      stylePreferences: [],
      fashionInterests: [],
      preferredClothingCategories: [],
      commonOccasions: [],
      preferredServiceTypes: [],
      priceRangeMin: null,
      priceRangeMax: null,
      preferredFit: null,
    },
  });
  await db.customerPreferredDesigner.deleteMany({ where: { customerProfileId } });
}
