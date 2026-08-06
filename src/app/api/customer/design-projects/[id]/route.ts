import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerDesignProject } from "@/lib/design-project";

// Part 19: the customer's own bundle — every version is selected explicitly
// (never a bare `include`) so `internalNotes` (Part 5) can never leak here,
// no matter what gets added to DesignVersion later.
const CUSTOMER_VERSION_SELECT = {
  id: true,
  previewId: true,
  versionNumber: true,
  status: true,
  previewType: true,
  previewImageUrl: true,
  changesSummary: true,
  designName: true,
  description: true,
  fabric: true,
  color: true,
  styleNotes: true,
  designInstructions: true,
  estimatedProductionDays: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  model: true,
  textures: { include: { fabricLibraryItem: true } },
} as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const project = await loadCustomerDesignProject(id, profile.id);

    const [brief, references, versions, revisionRequests, comments, activities, approvalRecord, serviceRequest, business, assignedDesigner, quotation] =
      await Promise.all([
        prisma.designBrief.findUnique({ where: { previewId: id } }),
        prisma.designReference.findMany({ where: { previewId: id }, orderBy: { createdAt: "desc" } }),
        prisma.designVersion.findMany({ where: { previewId: id }, orderBy: { versionNumber: "desc" }, select: CUSTOMER_VERSION_SELECT }),
        prisma.designRevisionRequest.findMany({ where: { previewId: id }, orderBy: { createdAt: "desc" } }),
        prisma.designComment.findMany({
          where: { previewId: id },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true } } },
        }),
        prisma.designActivity.findMany({ where: { previewId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.designApprovalRecord.findUnique({ where: { previewId: id } }),
        project.serviceRequestId
          ? prisma.serviceRequest.findUnique({ where: { id: project.serviceRequestId }, select: { id: true, requestCode: true, status: true } })
          : null,
        prisma.business.findUnique({ where: { id: project.businessId }, select: { id: true, name: true, logoUrl: true, slug: true } }),
        project.assignedDesignerId
          ? prisma.user.findUnique({ where: { id: project.assignedDesignerId }, select: { id: true, name: true } })
          : null,
        prisma.quotation.findFirst({
          where: { designPreviewId: id, status: { notIn: ["DECLINED", "CANCELLED", "ARCHIVED"] } },
          select: { id: true, quotationNumber: true, status: true, orderId: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    return NextResponse.json({
      project,
      brief,
      references,
      versions,
      revisionRequests,
      comments,
      activities,
      approvalRecord,
      serviceRequest,
      business,
      assignedDesigner,
      quotation,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
