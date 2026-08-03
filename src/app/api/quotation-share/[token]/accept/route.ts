import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { quotationApprovalDecisionSchema } from "@/lib/validations/quotation";
import { getQuotationShareOrThrow } from "@/lib/quotation-share";
import { finalizeQuotationDecision } from "@/lib/quotation-approval";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getQuotationShareOrThrow(token);
    const quotation = share.quotation;
    // Share tokens only ever exist for the legacy order-anchored flow — a
    // quotation created straight from a Design Project is reviewed through
    // the authenticated /api/customer/quotations routes instead.
    if (!quotation.orderId) throw new ApiError(404, "This quotation link is invalid");

    const data = quotationApprovalDecisionSchema.parse(await req.json());
    if (data.decision !== "ACCEPTED") throw new ApiError(400, "Invalid decision for this endpoint");

    const activeVersion = await prisma.quotationVersion.findFirst({
      where: { quotationId: quotation.id, status: "ACTIVE" },
    });
    if (!activeVersion) throw new ApiError(400, "There is no version currently awaiting review");

    const updated = await prisma.$transaction((tx) =>
      finalizeQuotationDecision(tx, {
        quotationId: quotation.id,
        versionId: activeVersion.id,
        businessId: quotation.businessId,
        orderId: quotation.orderId,
        decision: "ACCEPTED",
        ipAddress: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent"),
        actorType: "CUSTOMER",
      })
    );

    return NextResponse.json({ quotation: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
