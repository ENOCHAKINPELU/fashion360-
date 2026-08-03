import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { productionStageTemplateSchema } from "@/lib/validations/order";
import { ensureDefaultProductionStageTemplates } from "@/lib/production-stages";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    await ensureDefaultProductionStageTemplates(prisma, businessId);

    const templates = await prisma.productionStageTemplate.findMany({
      where: { businessId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const data = productionStageTemplateSchema.parse(await req.json());

    const template = await prisma.productionStageTemplate.create({
      data: {
        businessId,
        name: data.name,
        sortOrder: data.sortOrder,
        appliesToOrderTypes: data.appliesToOrderTypes,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
