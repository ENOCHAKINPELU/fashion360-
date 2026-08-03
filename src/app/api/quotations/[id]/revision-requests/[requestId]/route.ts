import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { getScopedQuotation } from "@/app/api/quotations/[id]/route";
import { z } from "zod";

const bodySchema = z.object({ status: z.enum(["IN_PROGRESS", "ADDRESSED", "DECLINED"]) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id, requestId } = await params;
    await getScopedQuotation(businessId, id);

    const existing = await prisma.quotationRevisionRequest.findFirst({ where: { id: requestId, quotationId: id } });
    if (!existing) throw new ApiError(404, "Revision request not found");

    const { status } = bodySchema.parse(await req.json());
    const revisionRequest = await prisma.quotationRevisionRequest.update({
      where: { id: requestId },
      data: { status, resolvedAt: status === "ADDRESSED" || status === "DECLINED" ? new Date() : null },
    });

    return NextResponse.json({ revisionRequest });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
