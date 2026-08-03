import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { customerAnnotationSchema } from "@/lib/validations/design-project";
import { loadCustomerDesignProject } from "@/lib/design-project";
import { logDesignActivity } from "@/lib/design-activity";
import { notifyDesignEvent } from "@/lib/design-notifications";

// Part 12: click-to-pin feedback, kept deliberately simple — one flat list
// per version, no threading. Reuses the existing DesignAnnotation model
// (already x/y-capable for the legacy token flow).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const { id, versionId } = await params;
    const { profile } = await requireCustomerContext();
    await loadCustomerDesignProject(id, profile.id);

    const version = await prisma.designVersion.findFirst({ where: { id: versionId, previewId: id } });
    if (!version) throw new ApiError(404, "Version not found");

    const annotations = await prisma.designAnnotation.findMany({ where: { versionId }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ annotations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const { id, versionId } = await params;
    const { profile } = await requireCustomerContext();
    const project = await loadCustomerDesignProject(id, profile.id);

    const version = await prisma.designVersion.findFirst({ where: { id: versionId, previewId: id } });
    if (!version) throw new ApiError(404, "Version not found");

    const data = customerAnnotationSchema.parse(await req.json());

    const annotation = await prisma.$transaction(async (tx) => {
      const created = await tx.designAnnotation.create({
        data: {
          versionId,
          businessId: project.businessId,
          authorType: "CUSTOMER",
          customerProfileId: profile.id,
          x: data.x,
          y: data.y,
          body: data.body,
        },
      });

      await logDesignActivity(tx, {
        previewId: id,
        businessId: project.businessId,
        type: "ANNOTATION_ADDED",
        title: "Customer pinned a note on the design",
        description: data.body.slice(0, 140),
        actorType: "CUSTOMER",
      });

      await notifyDesignEvent(tx, {
        businessId: project.businessId,
        assignedDesignerId: project.assignedDesignerId,
        title: "New note pinned on your design",
        body: `The customer pinned a note on ${project.name}.`,
        type: "info",
      });

      return created;
    });

    return NextResponse.json({ annotation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
