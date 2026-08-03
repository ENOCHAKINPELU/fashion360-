import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { designerCreateVersionSchema } from "@/lib/validations/design-project";
import { loadBusinessDesignProject } from "@/lib/design-project";
import { logDesignActivity } from "@/lib/design-activity";

// Business-only: returns every field including internalNotes, since this is
// the designer's own workspace view.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId } = await requireBusinessContext();
    await loadBusinessDesignProject(id, businessId);
    const versions = await prisma.designVersion.findMany({
      where: { previewId: id },
      orderBy: { versionNumber: "desc" },
      include: { model: true, textures: true },
    });
    return NextResponse.json({ versions });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// Part 5/6: creates a new immutable DesignVersion — the first version moves
// the project out of Draft, a later version is a revision (see the
// versions/[versionId]/submit route for the CUSTOMER_REVIEW handoff, which
// is a separate explicit step from creation so a designer can save drafts).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId, session } = await requireBusinessContext();
    const project = await loadBusinessDesignProject(id, businessId);
    const data = designerCreateVersionSchema.parse(await req.json());

    const versionNumber = project.latestVersionNumber + 1;
    const previewType = data.model ? "THREE_D" : "TWO_D";

    const version = await prisma.$transaction(async (tx) => {
      const created = await tx.designVersion.create({
        data: {
          previewId: id,
          businessId,
          versionNumber,
          status: "DRAFT",
          previewType,
          previewImageUrl: data.previewImageUrl || null,
          changesSummary: data.changesSummary || null,
          designName: data.designName,
          description: data.description || null,
          fabric: data.fabric || null,
          color: data.color || null,
          styleNotes: data.styleNotes || null,
          designInstructions: data.designInstructions || null,
          estimatedProductionDays: data.estimatedProductionDays ? Number(data.estimatedProductionDays) : null,
          tags: data.tags,
          internalNotes: data.internalNotes || null,
          createdById: session.user.id,
          model: data.model
            ? {
                create: {
                  businessId,
                  format: data.model.format,
                  url: data.model.url,
                  thumbnailUrl: data.model.thumbnailUrl || null,
                  fileSizeBytes: data.model.fileSizeBytes,
                  uploadedById: session.user.id,
                },
              }
            : undefined,
        },
        include: { model: true, textures: true },
      });

      await tx.designPreview.update({
        where: { id },
        data: { latestVersionNumber: versionNumber, previewType, status: "DESIGN_IN_PROGRESS" },
      });

      await logDesignActivity(tx, {
        previewId: id,
        businessId,
        type: "VERSION_CREATED",
        title: `Version ${versionNumber} created`,
        description: data.changesSummary,
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
