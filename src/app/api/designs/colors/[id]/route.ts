import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { colorLibraryItemSchema } from "@/lib/validations/design";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const color = await prisma.colorLibraryItem.findFirst({ where: { id, businessId } });
    if (!color) throw new ApiError(404, "Colour not found");

    const data = colorLibraryItemSchema.partial().parse(await req.json());

    const updated = await prisma.colorLibraryItem.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.hexValue !== undefined ? { hexValue: data.hexValue } : {}),
        ...(data.pairsWith !== undefined ? { pairsWith: data.pairsWith } : {}),
      },
    });

    return NextResponse.json({ color: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const color = await prisma.colorLibraryItem.findFirst({ where: { id, businessId } });
    if (!color) throw new ApiError(404, "Colour not found");

    await prisma.colorLibraryItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
