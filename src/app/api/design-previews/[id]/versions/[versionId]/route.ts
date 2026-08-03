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

    const version = await prisma.designVersion.findFirst({ where: { id: versionId, previewId: id } });
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

    return NextResponse.json({ version: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
