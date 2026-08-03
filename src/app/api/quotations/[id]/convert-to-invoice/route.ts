import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { convertQuotationToInvoice } from "@/lib/quotation-conversion";
import { getScopedQuotation } from "@/app/api/quotations/[id]/route";

// Copies the accepted version's items/pricing/terms into a brand-new,
// independently-editable Invoice snapshot — the quotation itself is never
// mutated by conversion, only marked CONVERTED (implementation rule: never
// overwrite an accepted quotation).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const quotation = await getScopedQuotation(businessId, id);

    if (quotation.status !== "ACCEPTED") throw new ApiError(400, "Only an accepted quotation can be converted to an invoice");
    if (!quotation.orderId) throw new ApiError(400, "This quotation has no order yet");

    const existingInvoice = await prisma.invoice.findUnique({ where: { quotationId: id } });
    if (existingInvoice) throw new ApiError(400, "This quotation already has an invoice");

    const invoice = await prisma.$transaction((tx) =>
      convertQuotationToInvoice(tx, { quotationId: id, businessId, orderId: quotation.orderId!, actorId: session.user.id })
    );

    await notifyFinancialEvent(prisma, {
      businessId,
      orderId: quotation.orderId,
      title: "Invoice created",
      body: `${invoice.invoiceNumber} was created from quotation ${quotation.quotationNumber}.`,
      type: "success",
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
