import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { discoverableDesignWhere } from "@/lib/design-catalog-access";
import { logCustomerBehavior } from "@/lib/customer-behavior";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();

    const design = await prisma.design.findFirst({
      where: { id, ...discoverableDesignWhere() },
      include: {
        business: { select: { id: true, name: true, logoUrl: true, city: true, state: true } },
        category: { select: { name: true } },
        tags: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    });
    if (!design) throw new ApiError(404, "Design not found");

    const favorited = await prisma.designFavorite.findUnique({ where: { designId_customerProfileId: { designId: id, customerProfileId: profile.id } } });

    await Promise.all([
      prisma.design.update({ where: { id }, data: { viewCount: { increment: 1 } } }),
      logCustomerBehavior(prisma, { customerProfileId: profile.id, businessId: design.businessId, type: "DESIGN_VIEWED", targetType: "DESIGN", targetId: id }),
    ]);

    return NextResponse.json({ design, favorited: !!favorited });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
