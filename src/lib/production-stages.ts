import type { OrderType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Section 11 defaults — businesses can rename, reorder, or add their own via
// the Production Stages settings; these are just what a fresh business starts with.
export const DEFAULT_PRODUCTION_STAGES: { name: string; appliesToOrderTypes: OrderType[] }[] = [
  { name: "Measurement", appliesToOrderTypes: [] },
  { name: "Pattern / Cutting", appliesToOrderTypes: ["BESPOKE", "CUSTOM", "REMAKE"] },
  { name: "Sewing", appliesToOrderTypes: ["BESPOKE", "CUSTOM", "REMAKE"] },
  { name: "Finishing", appliesToOrderTypes: [] },
  { name: "Fitting", appliesToOrderTypes: [] },
  { name: "Alteration", appliesToOrderTypes: [] },
  { name: "Final Inspection", appliesToOrderTypes: [] },
  { name: "Completed", appliesToOrderTypes: [] },
];

export async function ensureDefaultProductionStageTemplates(db: Db, businessId: string) {
  await Promise.all(
    DEFAULT_PRODUCTION_STAGES.map((stage, index) =>
      db.productionStageTemplate.upsert({
        where: { businessId_name: { businessId, name: stage.name } },
        update: {},
        create: {
          businessId,
          name: stage.name,
          sortOrder: index,
          isSystem: true,
          appliesToOrderTypes: stage.appliesToOrderTypes,
        },
      })
    )
  );
}

// Instantiate the OrderProductionStage rows for a newly created order, from
// whichever ProductionStageTemplates apply to its OrderType (an empty
// appliesToOrderTypes list on the template means "applies to every order type").
export async function createOrderProductionStages(
  db: Db,
  params: { orderId: string; businessId: string; orderType: OrderType }
) {
  const templates = await db.productionStageTemplate.findMany({
    where: { businessId: params.businessId },
    orderBy: { sortOrder: "asc" },
  });

  const applicable = templates.filter(
    (t) => t.appliesToOrderTypes.length === 0 || t.appliesToOrderTypes.includes(params.orderType)
  );

  if (applicable.length === 0) return;

  await db.orderProductionStage.createMany({
    data: applicable.map((template, index) => ({
      orderId: params.orderId,
      businessId: params.businessId,
      templateId: template.id,
      name: template.name,
      sortOrder: index,
    })),
  });
}
