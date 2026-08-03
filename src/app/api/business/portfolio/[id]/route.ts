import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { portfolioItemSchema } from "@/lib/validations/business-profile";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.businessPortfolioItem.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Portfolio item not found");

    const data = portfolioItemSchema.partial().parse(await req.json());
    const item = await prisma.businessPortfolioItem.update({ where: { id }, data });

    return NextResponse.json({ item });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.businessPortfolioItem.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Portfolio item not found");

    await prisma.businessPortfolioItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
