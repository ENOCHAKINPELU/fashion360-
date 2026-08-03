import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PREDEFINED_TAGS } from "@/lib/validations/customer";

type Db = typeof prisma | Prisma.TransactionClient;

export async function ensurePredefinedTags(db: Db, businessId: string) {
  await db.customerTag.createMany({
    data: PREDEFINED_TAGS.map((name) => ({ businessId, name, isSystem: true })),
    skipDuplicates: true,
  });
}
