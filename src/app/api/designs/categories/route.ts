import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designCategorySchema } from "@/lib/validations/design";
import { ensureDefaultDesignCategories } from "@/lib/design-categories";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    await ensureDefaultDesignCategories(prisma, businessId);

    const categories = await prisma.designCategory.findMany({
      where: { businessId },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: { _count: { select: { designs: true } } },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const { name, icon } = designCategorySchema.parse(await req.json());

    const existing = await prisma.designCategory.findUnique({ where: { businessId_name: { businessId, name } } });
    if (existing) throw new ApiError(409, "This category already exists");

    const category = await prisma.designCategory.create({ data: { businessId, name, icon } });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
