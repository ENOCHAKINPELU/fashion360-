import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designCollectionSchema } from "@/lib/validations/design";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const collection = await prisma.designCollection.findFirst({
      where: { id, businessId },
      include: {
        designs: {
          include: { category: true, tags: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!collection) throw new ApiError(404, "Collection not found");

    return NextResponse.json({ collection });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const collection = await prisma.designCollection.findFirst({ where: { id, businessId } });
    if (!collection) throw new ApiError(404, "Collection not found");

    const data = designCollectionSchema.partial().parse(await req.json());

    const updated = await prisma.designCollection.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.coverImageUrl !== undefined ? { coverImageUrl: data.coverImageUrl || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    return NextResponse.json({ collection: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const collection = await prisma.designCollection.findFirst({ where: { id, businessId } });
    if (!collection) throw new ApiError(404, "Collection not found");

    await prisma.$transaction([
      prisma.design.updateMany({ where: { collectionId: id }, data: { collectionId: null } }),
      prisma.designCollection.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
