import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designFormSchema } from "@/lib/validations/design";
import { notifyFollowersOfNewDesign } from "@/lib/personalization-notifications";
import { z } from "zod";

async function getScopedDesign(businessId: string, id: string) {
  const design = await prisma.design.findFirst({ where: { id, businessId } });
  if (!design) throw new ApiError(404, "Design not found");
  return design;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const design = await prisma.design.findFirst({
      where: { id, businessId },
      include: {
        category: true,
        collection: true,
        tags: true,
        images: { orderBy: { sortOrder: "asc" } },
        notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
        _count: { select: { favorites: true } },
      },
    });
    if (!design) throw new ApiError(404, "Design not found");

    return NextResponse.json({ design });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const actionSchema = z.object({ action: z.enum(["archive", "publish", "feature", "unfeature"]) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    const existing = await getScopedDesign(businessId, id);

    const rawBody = await req.json();
    // z.union([designFormSchema.partial(), actionSchema]) previously matched
    // { action: "archive" } against the first (all-optional) schema every
    // time, silently stripping "action" and no-op'ing the request — the
    // same class of bug fixed in the orders/appointments/design-previews
    // PATCH routes in earlier phases. Branching on the raw body first
    // avoids it.
    const body = "action" in rawBody ? actionSchema.parse(rawBody) : designFormSchema.partial().parse(rawBody);

    if ("action" in body) {
      const data =
        body.action === "archive"
          ? { status: "ARCHIVED" as const }
          : body.action === "publish"
            ? { status: "PUBLISHED" as const }
            : body.action === "feature"
              ? { isFeatured: true }
              : { isFeatured: false };

      const design = await prisma.design.update({
        where: { id },
        data,
        include: { category: true, collection: true, tags: true, images: { orderBy: { sortOrder: "asc" } } },
      });

      if (body.action === "publish" && existing.status !== "PUBLISHED") {
        const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
        await notifyFollowersOfNewDesign(prisma, { businessId, businessName: business?.name ?? "A designer you follow", designName: design.name });
      }

      return NextResponse.json({ design });
    }

    const data = body;

    const design = await prisma.$transaction(async (tx) => {
      if (data.images !== undefined) {
        await tx.designImage.deleteMany({ where: { designId: id } });
      }

      return tx.design.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description || null } : {}),
          ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
          ...(data.collectionId !== undefined ? { collectionId: data.collectionId || null } : {}),
          ...(data.mainImageUrl !== undefined ? { mainImageUrl: data.mainImageUrl } : {}),
          ...(data.occasion !== undefined ? { occasion: data.occasion || null } : {}),
          ...(data.estimatedCompletionDays !== undefined
            ? { estimatedCompletionDays: data.estimatedCompletionDays }
            : {}),
          ...(data.basePrice !== undefined ? { basePrice: data.basePrice } : {}),
          ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
          ...(data.fabricRecommendations !== undefined
            ? { fabricRecommendations: data.fabricRecommendations }
            : {}),
          ...(data.colorRecommendations !== undefined ? { colorRecommendations: data.colorRecommendations } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
          ...(data.tags !== undefined ? { tags: { set: data.tags.map((tagId) => ({ id: tagId })) } } : {}),
          ...(data.images !== undefined
            ? { images: { create: data.images.map((url, index) => ({ url, sortOrder: index })) } }
            : {}),
        },
        include: { category: true, collection: true, tags: true, images: { orderBy: { sortOrder: "asc" } } },
      });
    });

    if (data.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
      const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
      await notifyFollowersOfNewDesign(prisma, { businessId, businessName: business?.name ?? "A designer you follow", designName: design.name });
    }

    return NextResponse.json({ design });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedDesign(businessId, id);

    await prisma.design.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
