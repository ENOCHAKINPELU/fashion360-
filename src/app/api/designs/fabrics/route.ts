import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { fabricLibraryItemSchema } from "@/lib/validations/design";
import type { FabricAvailability } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const availability = req.nextUrl.searchParams.get("availability") as FabricAvailability | null;
    const search = req.nextUrl.searchParams.get("search")?.trim();

    const fabrics = await prisma.fabricLibraryItem.findMany({
      where: {
        businessId,
        ...(availability ? { availability } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ fabrics });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const data = fabricLibraryItemSchema.parse(await req.json());

    const existing = await prisma.fabricLibraryItem.findUnique({
      where: { businessId_name: { businessId, name: data.name } },
    });
    if (existing) throw new ApiError(409, "A fabric with this name already exists");

    const fabric = await prisma.fabricLibraryItem.create({
      data: {
        businessId,
        name: data.name,
        imageUrl: data.imageUrl || null,
        colorVariants: data.colorVariants,
        texture: data.texture || null,
        description: data.description || null,
        recommendedUses: data.recommendedUses,
        availability: data.availability,
      },
    });

    return NextResponse.json({ fabric }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
