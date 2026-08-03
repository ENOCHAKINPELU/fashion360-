import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designRevisionRequestUpdateSchema } from "@/lib/validations/design-preview";
import { getScopedPreview } from "@/app/api/design-previews/[id]/route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id, requestId } = await params;
    await getScopedPreview(businessId, id);

    const existing = await prisma.designRevisionRequest.findFirst({ where: { id: requestId, previewId: id } });
    if (!existing) throw new ApiError(404, "Revision request not found");

    const data = designRevisionRequestUpdateSchema.parse(await req.json());

    const revisionRequest = await prisma.designRevisionRequest.update({
      where: { id: requestId },
      data: {
        status: data.status,
        resolvedAt: data.status === "ADDRESSED" || data.status === "DECLINED" ? new Date() : null,
      },
    });

    return NextResponse.json({ revisionRequest });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
