import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { revisionRequestResponseSchema } from "@/lib/validations/design-project";
import { loadBusinessDesignProject } from "@/lib/design-project";
import { logDesignActivity } from "@/lib/design-activity";
import { notifyCustomer } from "@/lib/service-request-notify";

// Part 11: the designer's three responses to a customer's feedback/change
// request. Never edits an approved version directly — "accept" only moves
// the project into REVISION_IN_PROGRESS so the designer can then create a
// new DesignVersion (POST .../versions) and submit it (.../submit), which
// is what actually gets the customer their next review.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; reqId: string }> }) {
  try {
    const { id, reqId } = await params;
    const { businessId, session } = await requireBusinessContext();
    const project = await loadBusinessDesignProject(id, businessId);

    const revisionRequest = await prisma.designRevisionRequest.findUnique({ where: { id: reqId } });
    if (!revisionRequest || revisionRequest.previewId !== id) throw new ApiError(404, "Revision request not found");
    if (revisionRequest.status !== "OPEN") throw new ApiError(400, "This request has already been responded to");

    const data = revisionRequestResponseSchema.parse(await req.json());

    const result = await prisma.$transaction(async (tx) => {
      if (data.action === "ask-clarification") {
        await tx.designComment.create({
          data: {
            previewId: id,
            businessId,
            versionId: revisionRequest.versionId,
            authorType: "STAFF",
            authorId: session.user.id,
            body: data.responseNote || "Could you clarify what you'd like changed?",
          },
        });
        await logDesignActivity(tx, {
          previewId: id,
          businessId,
          type: "COMMENT_ADDED",
          title: "Designer asked for clarification",
          actorId: session.user.id,
        });
        if (project.customerProfileId) {
          await notifyCustomer(tx, {
            businessId,
            customerProfileId: project.customerProfileId,
            title: "Your designer has a question",
            body: `Your designer needs more detail about your requested change on "${project.name}".`,
            type: "info",
          });
        }
        return { revisionRequest, project };
      }

      const updatedRequest = await tx.designRevisionRequest.update({
        where: { id: reqId },
        data: {
          status: data.action === "accept" ? "IN_PROGRESS" : "DECLINED",
          resolvedAt: new Date(),
        },
      });

      const updatedProject = await tx.designPreview.update({
        where: { id },
        data: { status: data.action === "accept" ? "REVISION_IN_PROGRESS" : project.status },
      });

      await logDesignActivity(tx, {
        previewId: id,
        businessId,
        type: "DESIGNER_UPDATED",
        title: data.action === "accept" ? "Change request accepted, revision in progress" : "Change request declined",
        description: data.responseNote,
        actorId: session.user.id,
      });

      if (project.customerProfileId) {
        await notifyCustomer(tx, {
          businessId,
          customerProfileId: project.customerProfileId,
          title: data.action === "accept" ? "Your requested change was accepted" : "Your requested change was declined",
          body: data.responseNote || (data.action === "accept" ? "Your designer is working on a new version." : "Your designer declined this change."),
          type: data.action === "accept" ? "info" : "warning",
        });
      }

      return { revisionRequest: updatedRequest, project: updatedProject };
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
