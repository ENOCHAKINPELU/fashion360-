import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designVersionCustomizationSchema } from "@/lib/validations/design-preview";
import { z } from "zod";
import { getScopedPreview } from "@/app/api/design-previews/[id]/route";

const patchSchema = z.object({
  changesSummary: z.string().optional(),
  notes: z.string().optional(),
  previewImageUrl: z.string().url().optional().or(z.literal("")),
  customization: designVersionCustomizationSchema.partial().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id, versionId } = await params;
    await getScopedPreview(businessId, id);

    const version = await prisma.designVersion.findFirst({
      where: { id: versionId, previewId: id },
      include: { customization: true, model: true },
    });
    if (!version) throw new ApiError(404, "Version not found");
    if (version.status === "APPROVED") {
      throw new ApiError(400, "An approved, locked version cannot be edited, create a new version instead");
    }

    const data = patchSchema.parse(await req.json());

    const updated = await prisma.designVersion.update({
      where: { id: versionId },
      data: {
        ...(data.changesSummary !== undefined ? { changesSummary: data.changesSummary } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.previewImageUrl !== undefined ? { previewImageUrl: data.previewImageUrl || null } : {}),
        ...(data.customization
          ? {
              customization: {
                update: Object.fromEntries(
                  Object.entries(data.customization).filter(([, v]) => v !== undefined)
                ),
              },
            }
          : {}),
      },
      include: { customization: true, model: true, textures: true },
    });

    // Keep the 3D material in sync with the fabric picked in customization —
    // the fabric dropdown is the only fabric-selection UI a designer has, so
    // changing it here must re-drive fabric-material.ts, not just the text
    // label shown in Design Details. Only relevant for a version with a
    // model; a fabric with no reference photo can't populate the required
    // DesignTexture.imageUrl, so it's skipped (not an error) until one is
    // added to the fabric's library entry.
    if (data.customization && "fabricId" in data.customization && updated.model) {
      const existingPrimary = await prisma.designTexture.findFirst({ where: { versionId, role: "PRIMARY" } });
      const fabricId = updated.customization?.fabricId;
      const fabric = fabricId ? await prisma.fabricLibraryItem.findFirst({ where: { id: fabricId, businessId } }) : null;

      if (fabric?.imageUrl) {
        if (existingPrimary) {
          await prisma.designTexture.update({
            where: { id: existingPrimary.id },
            data: { name: fabric.name, imageUrl: fabric.imageUrl, colorHex: fabric.baseColorHex, materialType: fabric.texture, fabricLibraryItemId: fabric.id },
          });
        } else {
          await prisma.designTexture.create({
            data: {
              versionId,
              businessId,
              role: "PRIMARY",
              name: fabric.name,
              imageUrl: fabric.imageUrl,
              colorHex: fabric.baseColorHex,
              materialType: fabric.texture,
              fabricLibraryItemId: fabric.id,
            },
          });
        }
      } else if (existingPrimary) {
        // Fabric cleared, or swapped to one with no photo yet — remove the
        // stale material rather than leave the viewer showing a fabric the
        // customization no longer names.
        await prisma.designTexture.delete({ where: { id: existingPrimary.id } });
      }

      updated.textures = await prisma.designTexture.findMany({ where: { versionId } });
    }

    return NextResponse.json({ version: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
