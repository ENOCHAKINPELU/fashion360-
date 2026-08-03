import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { getScopedInvoice } from "@/app/api/invoices/[id]/route";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const invoice = await getScopedInvoice(businessId, id);

    if (invoice.status !== "DRAFT") throw new ApiError(400, "Only a draft invoice can be sent");

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
      await logFinancialTransaction(tx, {
        businessId,
        type: "INVOICE_SENT",
        description: `Invoice ${invoice.invoiceNumber} sent to customer`,
        orderId: invoice.orderId,
        customerId: invoice.customerId,
        invoiceId: id,
        previousStatus: "DRAFT",
        newStatus: "SENT",
        actorType: "STAFF",
        actorId: session.user.id,
      });
    });

    await notifyFinancialEvent(prisma, {
      businessId,
      orderId: invoice.orderId,
      title: "Invoice sent",
      body: `${invoice.invoiceNumber} was sent to the customer.`,
    });

    const updated = await prisma.invoice.findUnique({ where: { id } });
    return NextResponse.json({ invoice: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
