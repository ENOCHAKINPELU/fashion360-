import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { colorLibraryItemSchema } from "@/lib/validations/design";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const search = req.nextUrl.searchParams.get("search")?.trim();

    const colors = await prisma.colorLibraryItem.findMany({
      where: { businessId, ...(search ? { name: { contains: search, mode: "insensitive" } } : {}) },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ colors });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const data = colorLibraryItemSchema.parse(await req.json());

    const existing = await prisma.colorLibraryItem.findUnique({
      where: { businessId_name: { businessId, name: data.name } },
    });
    if (existing) throw new ApiError(409, "A colour with this name already exists");

    const color = await prisma.colorLibraryItem.create({
      data: { businessId, name: data.name, hexValue: data.hexValue, pairsWith: data.pairsWith },
    });

    return NextResponse.json({ color }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
