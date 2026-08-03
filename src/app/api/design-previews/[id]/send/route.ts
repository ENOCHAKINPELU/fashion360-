import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { logDesignActivity } from "@/lib/design-activity";
import { logOrderActivity } from "@/lib/order-activity";
import { getScopedPreview } from "@/app/api/design-previews/[id]/route";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const preview = await getScopedPreview(businessId, id);

    const latest = await prisma.designVersion.findFirst({
      where: { previewId: id, versionNumber: preview.latestVersionNumber },
    });
    if (!latest) throw new ApiError(400, "No version to send");
    if (latest.status === "APPROVED") throw new ApiError(400, "This version is already approved and locked");

    await prisma.$transaction(async (tx) => {
      await tx.designVersion.updateMany({
        where: { previewId: id, status: "ACTIVE" },
        data: { status: "SUPERSEDED" },
      });
      await tx.designVersion.update({ where: { id: latest.id }, data: { status: "ACTIVE" } });
      await tx.designPreview.update({
        where: { id },
        data: { status: "SENT_FOR_REVIEW", sentForReviewAt: new Date() },
      });

      await logDesignActivity(tx, {
        previewId: id,
        businessId,
        type: "SENT_FOR_REVIEW",
        title: `Version ${latest.versionNumber} sent for customer review`,
        actorId: session.user.id,
      });
      if (preview.orderId) {
        await logOrderActivity(tx, {
          orderId: preview.orderId,
          businessId,
          type: "DESIGN_UPDATED",
          title: `Design "${preview.name}" sent for customer review`,
        });
      }
    });

    const updated = await prisma.designPreview.findUnique({ where: { id } });
    return NextResponse.json({ preview: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
