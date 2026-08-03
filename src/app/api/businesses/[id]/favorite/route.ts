import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireCustomerContext();
    const { id: businessId } = await params;

    const business = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } });
    if (!business) throw new ApiError(404, "Business not found");

    const favorite = await prisma.businessFavorite.upsert({
      where: { customerProfileId_businessId: { customerProfileId: profile.id, businessId } },
      update: {},
      create: { customerProfileId: profile.id, businessId },
    });

    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireCustomerContext();
    const { id: businessId } = await params;

    await prisma.businessFavorite
      .delete({ where: { customerProfileId_businessId: { customerProfileId: profile.id, businessId } } })
      .catch(() => null);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
