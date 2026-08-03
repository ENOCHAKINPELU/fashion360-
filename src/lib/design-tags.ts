import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export const DEFAULT_DESIGN_TAGS = [
  "Luxury",
  "Trending",
  "Premium",
  "Wedding",
  "Simple",
  "Traditional",
  "Corporate",
] as const;

export async function ensureDefaultDesignTags(db: Db, businessId: string) {
  await db.designTag.createMany({
    data: DEFAULT_DESIGN_TAGS.map((name) => ({ businessId, name, isSystem: true })),
    skipDuplicates: true,
  });
}
