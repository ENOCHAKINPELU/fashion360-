import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { loadBusinessDesignProject } from "@/lib/design-project";
import { logDesignActivity } from "@/lib/design-activity";

const modelSchema = z.object({
  format: z.enum(["GLB", "GLTF", "OBJ", "FBX"]),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  fileSizeBytes: z.number().int().min(0).optional(),
});

// Part 17/18: 3D is optional and can be attached to a version at any time,
// independent of the customer-facing content — attaching one flips the
// version's previewType to THREE_D so the viewer knows to try the 3D path
// first, but 2D fields on the version are left untouched as the fallback.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const { id, versionId } = await params;
    const { businessId, session } = await requireBusinessContext();
    await loadBusinessDesignProject(id, businessId);

    const version = await prisma.designVersion.findUnique({ where: { id: versionId } });
    if (!version || version.previewId !== id) throw new ApiError(404, "Version not found");

    const data = modelSchema.parse(await req.json());

    const model = await prisma.$transaction(async (tx) => {
      const created = await tx.designModel.upsert({
        where: { versionId },
        create: {
          versionId,
          businessId,
          format: data.format,
          url: data.url,
          thumbnailUrl: data.thumbnailUrl || null,
          fileSizeBytes: data.fileSizeBytes,
          uploadedById: session.user.id,
        },
        update: {
          format: data.format,
          url: data.url,
          thumbnailUrl: data.thumbnailUrl || null,
          fileSizeBytes: data.fileSizeBytes,
          uploadedById: session.user.id,
        },
      });
      await tx.designVersion.update({ where: { id: versionId }, data: { previewType: "THREE_D" } });
      await logDesignActivity(tx, {
        previewId: id,
        businessId,
        type: "DESIGNER_UPDATED",
        title: `3D model added to version ${version.versionNumber}`,
        actorId: session.user.id,
      });
      return created;
    });

    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const { id, versionId } = await params;
    const { businessId } = await requireBusinessContext();
    await loadBusinessDesignProject(id, businessId);

    const version = await prisma.designVersion.findUnique({ where: { id: versionId } });
    if (!version || version.previewId !== id) throw new ApiError(404, "Version not found");

    const model = await prisma.designModel.findUnique({ where: { versionId } });
    return NextResponse.json({ model });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
