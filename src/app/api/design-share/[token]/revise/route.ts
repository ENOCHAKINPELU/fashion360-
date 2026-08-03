import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";
import { designRevisionRequestSchema } from "@/lib/validations/design-preview";
import { getShareOrThrow } from "@/lib/design-share";
import { logDesignActivity } from "@/lib/design-activity";
import { notifyDesignEvent } from "@/lib/design-notifications";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getShareOrThrow(token);
    const preview = share.preview;

    const data = designRevisionRequestSchema.parse(await req.json());

    const revisionRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.designRevisionRequest.create({
        data: {
          previewId: preview.id,
          businessId: preview.businessId,
          versionId: data.versionId || null,
          body: data.body,
          referenceImages: data.referenceImages,
        },
      });

      await tx.designPreview.update({
        where: { id: preview.id },
        data: { status: "REVISION_REQUESTED", revisionCount: { increment: 1 } },
      });

      await logDesignActivity(tx, {
        previewId: preview.id,
        businessId: preview.businessId,
        type: "REVISION_REQUESTED",
        title: "Customer requested a revision",
        description: data.body.slice(0, 140),
        actorType: "CUSTOMER",
      });
      await notifyDesignEvent(tx, {
        businessId: preview.businessId,
        orderId: preview.orderId,
        title: "Revision requested",
        body: `The customer requested a change on ${preview.name}.`,
        type: "warning",
      });

      return created;
    });

    return NextResponse.json({ revisionRequest }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
