import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designTagSchema } from "@/lib/validations/design";
import { ensureDefaultDesignTags } from "@/lib/design-tags";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    await ensureDefaultDesignTags(prisma, businessId);

    const tags = await prisma.designTag.findMany({
      where: { businessId },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ tags });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const { name, color } = designTagSchema.parse(await req.json());

    const existing = await prisma.designTag.findUnique({ where: { businessId_name: { businessId, name } } });
    if (existing) throw new ApiError(409, "This tag already exists");

    const tag = await prisma.designTag.create({ data: { businessId, name, color } });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
