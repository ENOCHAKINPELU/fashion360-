import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerQuotation } from "@/lib/quotation-project";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { notifyFinancialEvent } from "@/lib/financial-notifications";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const quotation = await loadCustomerQuotation(id, profile.id);

    if (!quotation.firstViewedAt) {
      await prisma.$transaction(async (tx) => {
        await tx.quotation.update({
          where: { id },
          data: { firstViewedAt: new Date(), status: quotation.status === "SENT" ? "VIEWED" : quotation.status },
        });
        await logFinancialTransaction(tx, {
          businessId: quotation.businessId,
          type: "QUOTATION_VIEWED",
          description: `Customer viewed quotation ${quotation.quotationNumber}`,
          customerId: quotation.customerId,
          quotationId: id,
          actorType: "CUSTOMER",
        });
        const preview = quotation.designPreviewId ? await tx.designPreview.findUnique({ where: { id: quotation.designPreviewId } }) : null;
        await notifyFinancialEvent(tx, {
          businessId: quotation.businessId,
          assignedDesignerId: preview?.assignedDesignerId,
          title: "Customer viewed quotation",
          body: `${quotation.quotationNumber} was viewed by the customer for the first time.`,
        });
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
