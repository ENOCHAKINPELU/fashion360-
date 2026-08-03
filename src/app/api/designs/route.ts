import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { designFormSchema } from "@/lib/validations/design";
import { nextDesignCode } from "@/lib/design-code";
import type { Prisma, DesignStatus, DesignDifficulty } from "@prisma/client";

const PAGE_SIZE = 24;

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;

    const search = params.get("search")?.trim();
    const categoryId = params.get("categoryId");
    const collectionId = params.get("collectionId");
    const tag = params.get("tag");
    const status = params.get("status") as DesignStatus | null;
    const difficulty = params.get("difficulty") as DesignDifficulty | null;
    const occasion = params.get("occasion");
    const featured = params.get("featured");
    const minPrice = params.get("minPrice");
    const maxPrice = params.get("maxPrice");
    const sort = params.get("sort") ?? "createdAt:desc";
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const pageSize = Math.min(60, Math.max(1, Number(params.get("pageSize") ?? PAGE_SIZE)));

    const where: Prisma.DesignWhereInput = {
      businessId,
      ...(status ? { status } : { status: { not: "ARCHIVED" } }),
      ...(categoryId ? { categoryId } : {}),
      ...(collectionId ? { collectionId } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(occasion ? { occasion: { contains: occasion, mode: "insensitive" } } : {}),
      ...(featured === "true" ? { isFeatured: true } : {}),
      ...(tag ? { tags: { some: { id: tag } } } : {}),
      ...(minPrice || maxPrice
        ? {
            basePrice: {
              ...(minPrice ? { gte: Number(minPrice) } : {}),
              ...(maxPrice ? { lte: Number(maxPrice) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { designCode: { contains: search, mode: "insensitive" } },
              { occasion: { contains: search, mode: "insensitive" } },
              { tags: { some: { name: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const [sortField, sortDir] = sort.split(":") as [string, "asc" | "desc"];
    const orderBy: Prisma.DesignOrderByWithRelationInput =
      sortField === "popular" ? { viewCount: sortDir } : { [sortField]: sortDir };

    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: true,
          collection: true,
          tags: true,
          images: { orderBy: { sortOrder: "asc" } },
          _count: { select: { favorites: true } },
        },
      }),
      prisma.design.count({ where }),
    ]);

    return NextResponse.json({
      designs,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = designFormSchema.parse(await req.json());

    const design = await prisma.$transaction(async (tx) => {
      const designCode = await nextDesignCode(tx, businessId);
      return tx.design.create({
        data: {
          businessId,
          designCode,
          name: data.name,
          description: data.description || null,
          categoryId: data.categoryId,
          collectionId: data.collectionId || null,
          mainImageUrl: data.mainImageUrl,
          occasion: data.occasion || null,
          estimatedCompletionDays: data.estimatedCompletionDays,
          basePrice: data.basePrice,
          difficulty: data.difficulty,
          fabricRecommendations: data.fabricRecommendations,
          colorRecommendations: data.colorRecommendations,
          status: data.status,
          isFeatured: data.isFeatured,
          createdById: session.user.id,
          tags: data.tags.length ? { connect: data.tags.map((id) => ({ id })) } : undefined,
          images: data.images.length
            ? { create: data.images.map((url, index) => ({ url, sortOrder: index })) }
            : undefined,
          notes: data.notes
            ? { create: [{ body: data.notes, authorId: session.user.id, category: "CONSTRUCTION" }] }
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
