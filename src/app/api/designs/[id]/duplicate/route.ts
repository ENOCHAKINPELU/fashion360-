import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { nextDesignCode } from "@/lib/design-code";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const source = await prisma.design.findFirst({
      where: { id, businessId },
      include: { tags: true, images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!source) throw new ApiError(404, "Design not found");

    const design = await prisma.$transaction(async (tx) => {
      const designCode = await nextDesignCode(tx, businessId);
      return tx.design.create({
        data: {
          businessId,
          designCode,
          name: `${source.name} (Copy)`,
          description: source.description,
          categoryId: source.categoryId,
          collectionId: source.collectionId,
          mainImageUrl: source.mainImageUrl,
          occasion: source.occasion,
          estimatedCompletionDays: source.estimatedCompletionDays,
          basePrice: source.basePrice,
          difficulty: source.difficulty,
          fabricRecommendations: source.fabricRecommendations,
          colorRecommendations: source.colorRecommendations,
          status: "DRAFT",
          isFeatured: false,
          createdById: session.user.id,
          tags: source.tags.length ? { connect: source.tags.map((tag) => ({ id: tag.id })) } : undefined,
          images: source.images.length
            ? { create: source.images.map((img) => ({ url: img.url, mediaType: img.mediaType, sortOrder: img.sortOrder })) }
            : undefined,
        },
        include: { category: true, collection: true, tags: true, images: { orderBy: { sortOrder: "asc" } } },
      });
    });

    return NextResponse.json({ design }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
