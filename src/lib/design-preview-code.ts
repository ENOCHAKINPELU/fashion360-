import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export async function nextDesignPreviewCode(db: Db, businessId: string) {
  const count = await db.designPreview.count({ where: { businessId } });
  return `DSN-${String(count + 1).padStart(4, "0")}`;
}
