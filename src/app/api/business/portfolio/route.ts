import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { portfolioItemSchema } from "@/lib/validations/business-profile";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    const items = await prisma.businessPortfolioItem.findMany({ where: { businessId }, orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ items });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = portfolioItemSchema.parse(await req.json());

    const count = await prisma.businessPortfolioItem.count({ where: { businessId } });
    const item = await prisma.businessPortfolioItem.create({
      data: {
        businessId,
        imageUrl: data.imageUrl,
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags,
        sortOrder: count,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
