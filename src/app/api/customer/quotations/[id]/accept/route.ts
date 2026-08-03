import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerQuotation } from "@/lib/quotation-project";
import { finalizeQuotationDecision } from "@/lib/quotation-approval";
import { createOrderFromAcceptedQuotation } from "@/lib/order-agreement";

const acceptSchema = z.object({ confirm: z.literal(true, { message: "Explicit confirmation is required" }) });

// Part 5/7: "Accept Quote" — explicit confirmation required, and doing so
// immediately generates the Order Agreement (Order + OrderAgreement +
// Invoice, all in the same transaction as the decision) so there is never a
// window where a quotation is ACCEPTED but no order exists yet.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const quotation = await loadCustomerQuotation(id, profile.id);
    if (quotation.status !== "SENT" && quotation.status !== "VIEWED") {
      throw new ApiError(400, "There's no quotation currently awaiting your decision");
    }

    acceptSchema.parse(await req.json());

    const activeVersion = await prisma.quotationVersion.findFirst({ where: { quotationId: id, status: "ACTIVE" } });
    if (!activeVersion) throw new ApiError(400, "There is no version currently awaiting review");

    const result = await prisma.$transaction(
      async (tx) => {
        await finalizeQuotationDecision(tx, {
          quotationId: id,
          versionId: activeVersion.id,
          businessId: quotation.businessId,
          orderId: quotation.orderId,
          decision: "ACCEPTED",
          ipAddress: req.headers.get("x-forwarded-for"),
          userAgent: req.headers.get("user-agent"),
          actorType: "CUSTOMER",
          customerProfileId: profile.id,
        });

        if (quotation.orderId) return { order: null, agreement: null, invoice: null };

        return createOrderFromAcceptedQuotation(tx, {
          quotationId: id,
          businessId: quotation.businessId,
          ipAddress: req.headers.get("x-forwarded-for"),
          userAgent: req.headers.get("user-agent"),
          actorId: null,
        });
      },
      // Generating an Order Agreement fans out into a lot of sequential
      // writes (order + 21-stage timeline + agreement + invoice + ledger +
      // notifications) — the default 5s interactive-transaction timeout is
      // too tight against a pooled remote connection.
      { timeout: 20000, maxWait: 10000 }
    );

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
