import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { discoverableDesignWhere } from "@/lib/design-catalog-access";
import { logCustomerBehavior } from "@/lib/customer-behavior";

// The marketplace-wide self-service save — distinct from the pre-existing
// business-staff POST /api/designs/[id]/favorite (which favorites on
// behalf of a per-business CRM customer). This one works even when the
// customer has never interacted with the design's business before.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();

    const design = await prisma.design.findFirst({ where: { id, ...discoverableDesignWhere() } });
    if (!design) throw new ApiError(404, "Design not found");

    const existing = await prisma.designFavorite.findUnique({ where: { designId_customerProfileId: { designId: id, customerProfileId: profile.id } } });

    if (existing) {
      await prisma.designFavorite.delete({ where: { id: existing.id } });
      await logCustomerBehavior(prisma, { customerProfileId: profile.id, businessId: design.businessId, type: "DESIGN_UNSAVED", targetType: "DESIGN", targetId: id });
      return NextResponse.json({ favorited: false });
    }

    await prisma.designFavorite.create({ data: { businessId: design.businessId, designId: id, customerProfileId: profile.id } });
    await logCustomerBehavior(prisma, { customerProfileId: profile.id, businessId: design.businessId, type: "DESIGN_SAVED", targetType: "DESIGN", targetId: id });
    return NextResponse.json({ favorited: true }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
