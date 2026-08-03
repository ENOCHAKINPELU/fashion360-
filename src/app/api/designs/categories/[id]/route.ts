import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designCategorySchema } from "@/lib/validations/design";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const category = await prisma.designCategory.findFirst({ where: { id, businessId } });
    if (!category) throw new ApiError(404, "Category not found");

    const data = designCategorySchema.partial().parse(await req.json());

    const updated = await prisma.designCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
      },
    });

    return NextResponse.json({ category: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const category = await prisma.designCategory.findFirst({ where: { id, businessId } });
    if (!category) throw new ApiError(404, "Category not found");
    if (category.isSystem) throw new ApiError(400, "System categories cannot be deleted");

    await prisma.designCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
