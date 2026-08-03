import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireCustomerContext();
    const { id: portfolioItemId } = await params;

    const item = await prisma.businessPortfolioItem.findUnique({ where: { id: portfolioItemId }, select: { id: true } });
    if (!item) throw new ApiError(404, "Portfolio item not found");

    const favorite = await prisma.portfolioFavorite.upsert({
      where: { customerProfileId_portfolioItemId: { customerProfileId: profile.id, portfolioItemId } },
      update: {},
      create: { customerProfileId: profile.id, portfolioItemId },
    });

    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireCustomerContext();
    const { id: portfolioItemId } = await params;

    await prisma.portfolioFavorite
      .delete({ where: { customerProfileId_portfolioItemId: { customerProfileId: profile.id, portfolioItemId } } })
      .catch(() => null);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
