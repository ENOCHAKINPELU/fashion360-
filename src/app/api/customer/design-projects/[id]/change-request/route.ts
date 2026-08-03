import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { postApprovalChangeRequestSchema } from "@/lib/validations/design-project";
import { loadCustomerDesignProject } from "@/lib/design-project";
import { logDesignActivity } from "@/lib/design-activity";
import { notifyDesignEvent } from "@/lib/design-notifications";

// Part 28: after Design Lock, a customer can still ask for a change, but it
// never touches the locked version directly — it's a new DesignRevisionRequest
// (isPostApproval: true) that the business reviews via the same
// revision-requests/respond endpoint; accepting it creates a brand-new
// version and the project goes back through CUSTOMER_REVIEW, leaving the
// original approved version untouched in history (Part 15/28).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const project = await loadCustomerDesignProject(id, profile.id);
    if (project.status !== "DESIGN_LOCKED") {
      throw new ApiError(400, "Post-approval change requests are only available once your design is locked");
    }

    const data = postApprovalChangeRequestSchema.parse(await req.json());
    const approvedVersion = await prisma.designVersion.findFirst({ where: { previewId: id, status: "APPROVED" } });

    const revisionRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.designRevisionRequest.create({
        data: {
          previewId: id,
          businessId: project.businessId,
          versionId: approvedVersion?.id ?? null,
          customerProfileId: profile.id,
          isPostApproval: true,
          reason: data.reason,
          body: data.requestedChange,
          referenceImages: data.referenceImageUrl ? [data.referenceImageUrl] : [],
        },
      });

      await logDesignActivity(tx, {
        previewId: id,
        businessId: project.businessId,
        type: "POST_APPROVAL_CHANGE_REQUESTED",
        title: "Customer requested a change after approval",
        description: data.requestedChange.slice(0, 140),
        actorType: "CUSTOMER",
      });

      await notifyDesignEvent(tx, {
        businessId: project.businessId,
        assignedDesignerId: project.assignedDesignerId,
        title: "Post-approval change requested",
        body: `The customer requested a change on the locked design "${project.name}".`,
        type: "warning",
      });

      return created;
    });

    return NextResponse.json({ revisionRequest }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
