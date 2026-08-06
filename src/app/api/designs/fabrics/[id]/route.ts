import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { fabricLibraryItemSchema } from "@/lib/validations/design";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const fabric = await prisma.fabricLibraryItem.findFirst({ where: { id, businessId } });
    if (!fabric) throw new ApiError(404, "Fabric not found");

    const data = fabricLibraryItemSchema.partial().parse(await req.json());

    const updated = await prisma.fabricLibraryItem.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
        ...(data.colorVariants !== undefined ? { colorVariants: data.colorVariants } : {}),
        ...(data.texture !== undefined ? { texture: data.texture || null } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.recommendedUses !== undefined ? { recommendedUses: data.recommendedUses } : {}),
        ...(data.availability !== undefined ? { availability: data.availability } : {}),
        ...(data.baseColorHex !== undefined ? { baseColorHex: data.baseColorHex || null } : {}),
        ...(data.roughness !== undefined ? { roughness: data.roughness } : {}),
        ...(data.metalness !== undefined ? { metalness: data.metalness } : {}),
        ...(data.opacity !== undefined ? { opacity: data.opacity } : {}),
        ...(data.reflectivity !== undefined ? { reflectivity: data.reflectivity } : {}),
        ...(data.textureMapUrl !== undefined ? { textureMapUrl: data.textureMapUrl || null } : {}),
        ...(data.normalMapUrl !== undefined ? { normalMapUrl: data.normalMapUrl || null } : {}),
      },
    });

    return NextResponse.json({ fabric: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const fabric = await prisma.fabricLibraryItem.findFirst({ where: { id, businessId } });
    if (!fabric) throw new ApiError(404, "Fabric not found");

    await prisma.fabricLibraryItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
