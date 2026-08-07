import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designProjectUpdateSchema } from "@/lib/validations/design-project";
import { loadBusinessDesignProject } from "@/lib/design-project";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId } = await requireBusinessContext();
    const project = await loadBusinessDesignProject(id, businessId);

    const [customerProfile, brief, references, versions, revisionRequests, comments, activities, approvalRecord, serviceRequest, measurementProfile, assignedDesigner] =
      await Promise.all([
        project.customerProfileId
          ? prisma.customerProfile.findUnique({
              where: { id: project.customerProfileId },
              select: { id: true, user: { select: { name: true, email: true, image: true } } },
            })
          : null,
        prisma.designBrief.findUnique({ where: { previewId: id } }),
        prisma.designReference.findMany({ where: { previewId: id }, orderBy: { createdAt: "desc" } }),
        prisma.designVersion.findMany({
          where: { previewId: id },
          orderBy: { versionNumber: "desc" },
          include: { model: true, textures: { include: { fabricLibraryItem: true } } },
        }),
        prisma.designRevisionRequest.findMany({ where: { previewId: id }, orderBy: { createdAt: "desc" } }),
        prisma.designComment.findMany({ where: { previewId: id }, orderBy: { createdAt: "desc" } }),
        prisma.designActivity.findMany({ where: { previewId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.designApprovalRecord.findUnique({ where: { previewId: id } }),
        project.serviceRequestId ? prisma.serviceRequest.findUnique({ where: { id: project.serviceRequestId } }) : null,
        project.measurementProfileId
          ? prisma.passportMeasurementProfile.findUnique({
              where: { id: project.measurementProfileId },
              include: { currentVersion: true },
            })
          : null,
        project.assignedDesignerId ? prisma.user.findUnique({ where: { id: project.assignedDesignerId }, select: { id: true, name: true, email: true } }) : null,
      ]);

    return NextResponse.json({
      project,
      customerProfile,
      brief,
      references,
      versions,
      revisionRequests,
      comments,
      activities,
      approvalRecord,
      serviceRequest,
      measurementProfile,
      assignedDesigner,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId } = await requireBusinessContext();
    await loadBusinessDesignProject(id, businessId);
    const data = designProjectUpdateSchema.parse(await req.json());

    if (data.assignedDesignerId) {
      const designer = await prisma.user.findUnique({ where: { id: data.assignedDesignerId } });
      if (!designer || designer.businessId !== businessId) throw new ApiError(400, "Invalid designer");
    }

    const project = await prisma.designPreview.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        assignedDesignerId: data.assignedDesignerId === "" ? null : data.assignedDesignerId,
      },
    });

    return NextResponse.json({ project });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
