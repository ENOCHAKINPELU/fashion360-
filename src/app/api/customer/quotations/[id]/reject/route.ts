import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerQuotation } from "@/lib/quotation-project";
import { finalizeQuotationDecision } from "@/lib/quotation-approval";

const rejectSchema = z.object({ confirm: z.literal(true, { message: "Explicit confirmation is required" }) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const quotation = await loadCustomerQuotation(id, profile.id);
    if (quotation.status !== "SENT" && quotation.status !== "VIEWED") {
      throw new ApiError(400, "There's no quotation currently awaiting your decision");
    }

    rejectSchema.parse(await req.json());

    const activeVersion = await prisma.quotationVersion.findFirst({ where: { quotationId: id, status: "ACTIVE" } });
    if (!activeVersion) throw new ApiError(400, "There is no version currently awaiting review");

    const updated = await prisma.$transaction((tx) =>
      finalizeQuotationDecision(tx, {
        quotationId: id,
        versionId: activeVersion.id,
        businessId: quotation.businessId,
        orderId: quotation.orderId,
        decision: "DECLINED",
        ipAddress: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent"),
        actorType: "CUSTOMER",
        customerProfileId: profile.id,
      })
    );

    return NextResponse.json({ quotation: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
