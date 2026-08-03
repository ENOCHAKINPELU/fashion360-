import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export const DEFAULT_DESIGN_CATEGORIES = [
  "Men",
  "Women",
  "Children",
  "Bridal",
  "Traditional",
  "Native Wear",
  "Corporate",
  "Casual",
  "Luxury",
  "Evening Wear",
  "Wedding",
  "Agbada",
  "Kaftan",
  "Senator",
  "Suit",
  "Dress",
] as const;

export async function ensureDefaultDesignCategories(db: Db, businessId: string) {
  await db.designCategory.createMany({
    data: DEFAULT_DESIGN_CATEGORIES.map((name) => ({ businessId, name, isSystem: true })),
    skipDuplicates: true,
  });
}
