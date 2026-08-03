import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";
import { quotationRevisionRequestSchema } from "@/lib/validations/quotation";
import { getQuotationShareOrThrow } from "@/lib/quotation-share";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { notifyFinancialEvent } from "@/lib/financial-notifications";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getQuotationShareOrThrow(token);
    const quotation = share.quotation;

    const data = quotationRevisionRequestSchema.parse(await req.json());

    const revisionRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.quotationRevisionRequest.create({
        data: {
          quotationId: quotation.id,
          businessId: quotation.businessId,
          versionId: data.versionId || null,
          body: data.body,
        },
      });

      await logFinancialTransaction(tx, {
        businessId: quotation.businessId,
        type: "QUOTATION_REVISION_REQUESTED",
        description: `Customer requested changes to quotation ${quotation.quotationNumber}`,
        orderId: quotation.orderId,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        actorType: "CUSTOMER",
      });
      await notifyFinancialEvent(tx, {
        businessId: quotation.businessId,
        orderId: quotation.orderId,
        title: "Quotation revision requested",
        body: `The customer requested changes on ${quotation.quotationNumber}.`,
        type: "warning",
      });

      return created;
    });

    return NextResponse.json({ revisionRequest }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
