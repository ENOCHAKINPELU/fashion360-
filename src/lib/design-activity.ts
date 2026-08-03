import type { Prisma, DesignActivityType, DesignCommentAuthorType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export async function logDesignActivity(
  db: Db,
  params: {
    previewId: string;
    businessId: string;
    type: DesignActivityType;
    title: string;
    description?: string;
    previousValue?: string | null;
    newValue?: string | null;
    actorType?: DesignCommentAuthorType;
    actorId?: string | null;
  }
) {
  await db.designActivity.create({
    data: {
      previewId: params.previewId,
      businessId: params.businessId,
      type: params.type,
      title: params.title,
      description: params.description,
      previousValue: params.previousValue,
      newValue: params.newValue,
      actorType: params.actorType ?? "STAFF",
      actorId: params.actorId ?? null,
    },
  });
}
