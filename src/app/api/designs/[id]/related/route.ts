import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const design = await prisma.design.findFirst({
      where: { id, businessId },
      include: { tags: { select: { id: true } } },
    });
    if (!design) throw new ApiError(404, "Design not found");

    const tagIds = design.tags.map((tag) => tag.id);
    const orConditions = [
      ...(design.categoryId ? [{ categoryId: design.categoryId }] : []),
      ...(tagIds.length ? [{ tags: { some: { id: { in: tagIds } } } }] : []),
      ...(design.occasion ? [{ occasion: design.occasion }] : []),
    ];

    const related = orConditions.length
      ? await prisma.design.findMany({
          where: { businessId, id: { not: id }, status: { not: "ARCHIVED" }, OR: orConditions },
          orderBy: { viewCount: "desc" },
          take: 8,
          include: { category: true, tags: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
        })
      : [];

    return NextResponse.json({ designs: related });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
