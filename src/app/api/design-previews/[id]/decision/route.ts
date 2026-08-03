import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designApprovalDecisionSchema } from "@/lib/validations/design-preview";
import { finalizeDesignDecision } from "@/lib/design-approval";
import { getScopedPreview } from "@/app/api/design-previews/[id]/route";
import { z } from "zod";

// Lets staff record an approval/rejection decision taken outside the
// customer portal (e.g. verbal sign-off over a phone call) using the exact
// same locking/versioning/order-integration path as the customer share flow.
const bodySchema = designApprovalDecisionSchema.and(z.object({ versionId: z.string().min(1) }));

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const preview = await getScopedPreview(businessId, id);

    const data = bodySchema.parse(await req.json());

    const version = await prisma.designVersion.findFirst({ where: { id: data.versionId, previewId: id } });
    if (!version) throw new ApiError(404, "Version not found");
    if (version.status === "APPROVED") throw new ApiError(400, "This version is already approved and locked");

    const updated = await prisma.$transaction((tx) =>
      finalizeDesignDecision(tx, {
        previewId: id,
        versionId: data.versionId,
        businessId,
        orderId: preview.orderId,
        decision: data.decision,
        recordedByType: "STAFF",
        recordedById: session.user.id,
      })
    );

    return NextResponse.json({ preview: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
