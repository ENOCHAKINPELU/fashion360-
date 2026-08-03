import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { designApprovalDecisionSchema } from "@/lib/validations/design-preview";
import { getShareOrThrow } from "@/lib/design-share";
import { finalizeDesignDecision } from "@/lib/design-approval";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getShareOrThrow(token);
    const preview = share.preview;

    const data = designApprovalDecisionSchema.parse(await req.json());
    if (data.decision !== "APPROVED") throw new ApiError(400, "Invalid decision for this endpoint");

    const activeVersion = await prisma.designVersion.findFirst({
      where: { previewId: preview.id, status: "ACTIVE" },
    });
    if (!activeVersion) throw new ApiError(400, "There is no version currently awaiting review");

    const updated = await prisma.$transaction((tx) =>
      finalizeDesignDecision(tx, {
        previewId: preview.id,
        versionId: activeVersion.id,
        businessId: preview.businessId,
        orderId: preview.orderId,
        decision: "APPROVED",
        ipAddress: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent"),
        recordedByType: "CUSTOMER",
      })
    );

    return NextResponse.json({ preview: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
