import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { customerFeedbackSchema } from "@/lib/validations/design-project";
import { loadCustomerDesignProject } from "@/lib/design-project";
import { logDesignActivity } from "@/lib/design-activity";
import { notifyDesignEvent } from "@/lib/design-notifications";

// Part 9/11: structured "request changes" — only valid while the customer
// actually has a version to react to.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const project = await loadCustomerDesignProject(id, profile.id);
    if (project.status !== "CUSTOMER_REVIEW") {
      throw new ApiError(400, "There's no design version currently awaiting your review");
    }

    const data = customerFeedbackSchema.parse(await req.json());
    const version = await prisma.designVersion.findUnique({ where: { id: data.versionId } });
    if (!version || version.previewId !== id) throw new ApiError(404, "Version not found");

    const revisionRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.designRevisionRequest.create({
        data: {
          previewId: id,
          businessId: project.businessId,
          versionId: data.versionId,
          customerProfileId: profile.id,
          changeCategory: data.changeCategory,
          body: data.body,
          referenceImages: data.referenceImages,
        },
      });

      await tx.designPreview.update({
        where: { id },
        data: { status: "CHANGES_REQUESTED", revisionCount: { increment: 1 } },
      });

      await logDesignActivity(tx, {
        previewId: id,
        businessId: project.businessId,
        type: "REVISION_REQUESTED",
        title: "Customer requested a change",
        description: data.body.slice(0, 140),
        actorType: "CUSTOMER",
      });

      await notifyDesignEvent(tx, {
        businessId: project.businessId,
        assignedDesignerId: project.assignedDesignerId,
        title: "Change requested",
        body: `The customer requested a change on ${project.name}.`,
        type: "warning",
      });

      return created;
    });

    return NextResponse.json({ revisionRequest }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
