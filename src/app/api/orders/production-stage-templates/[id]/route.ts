import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { productionStageTemplateSchema } from "@/lib/validations/order";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.productionStageTemplate.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Production stage not found");

    const data = productionStageTemplateSchema.partial().parse(await req.json());

    const template = await prisma.productionStageTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.appliesToOrderTypes !== undefined ? { appliesToOrderTypes: data.appliesToOrderTypes } : {}),
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.productionStageTemplate.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Production stage not found");
    if (existing.isSystem) throw new ApiError(400, "Default production stages cannot be deleted");

    await prisma.productionStageTemplate.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
