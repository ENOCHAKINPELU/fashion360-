import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { quotationApprovalDecisionSchema } from "@/lib/validations/quotation";
import { finalizeQuotationDecision } from "@/lib/quotation-approval";
import { getScopedQuotation } from "@/app/api/quotations/[id]/route";
import { z } from "zod";

// Lets staff record an accept/decline decision taken outside the customer
// portal (e.g. verbal sign-off over a phone call), using the exact same
// locking/versioning path as the customer share flow.
const bodySchema = quotationApprovalDecisionSchema.and(z.object({ versionId: z.string().min(1) }));

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const quotation = await getScopedQuotation(businessId, id);

    const data = bodySchema.parse(await req.json());
    const version = await prisma.quotationVersion.findFirst({ where: { id: data.versionId, quotationId: id } });
    if (!version) throw new ApiError(404, "Version not found");
    if (version.status === "ACCEPTED") throw new ApiError(400, "This version is already accepted and locked");

    const updated = await prisma.$transaction((tx) =>
      finalizeQuotationDecision(tx, {
        quotationId: id,
        versionId: data.versionId,
        businessId,
        orderId: quotation.orderId,
        decision: data.decision,
        actorType: "STAFF",
        actorId: session.user.id,
      })
    );

    return NextResponse.json({ quotation: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
