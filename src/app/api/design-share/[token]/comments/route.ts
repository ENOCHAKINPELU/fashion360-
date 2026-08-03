import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";
import { designCommentSchema } from "@/lib/validations/design-preview";
import { getShareOrThrow } from "@/lib/design-share";
import { logDesignActivity } from "@/lib/design-activity";
import { notifyDesignEvent } from "@/lib/design-notifications";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getShareOrThrow(token);
    const preview = share.preview;

    const data = designCommentSchema.parse(await req.json());

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.designComment.create({
        data: {
          previewId: preview.id,
          businessId: preview.businessId,
          versionId: data.versionId || null,
          authorType: "CUSTOMER",
          body: data.body,
          imageUrl: data.imageUrl || null,
        },
      });

      await logDesignActivity(tx, {
        previewId: preview.id,
        businessId: preview.businessId,
        type: "COMMENT_ADDED",
        title: "Customer added a comment",
        description: data.body.slice(0, 140),
        actorType: "CUSTOMER",
      });
      await notifyDesignEvent(tx, {
        businessId: preview.businessId,
        orderId: preview.orderId,
        title: "New comment from customer",
        body: `${preview.name}: "${data.body.slice(0, 100)}"`,
      });

      return created;
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
