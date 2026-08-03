import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designCollectionSchema } from "@/lib/validations/design";
import type { DesignStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const status = req.nextUrl.searchParams.get("status") as DesignStatus | null;

    const collections = await prisma.designCollection.findMany({
      where: { businessId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { designs: true } } },
    });

    return NextResponse.json({ collections });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const data = designCollectionSchema.parse(await req.json());

    const existing = await prisma.designCollection.findUnique({
      where: { businessId_name: { businessId, name: data.name } },
    });
    if (existing) throw new ApiError(409, "A collection with this name already exists");

    const collection = await prisma.designCollection.create({
      data: {
        businessId,
        name: data.name,
        description: data.description || null,
        coverImageUrl: data.coverImageUrl || null,
        status: data.status,
      },
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
