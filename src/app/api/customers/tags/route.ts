import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { customerTagSchema } from "@/lib/validations/customer";
import { ensurePredefinedTags } from "@/lib/customer-tags";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    await ensurePredefinedTags(prisma, businessId);

    const tags = await prisma.customerTag.findMany({
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
    const { name, color } = customerTagSchema.parse(await req.json());

    const existing = await prisma.customerTag.findUnique({ where: { businessId_name: { businessId, name } } });
    if (existing) throw new ApiError(409, "This tag already exists");

    const tag = await prisma.customerTag.create({ data: { businessId, name, color } });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
