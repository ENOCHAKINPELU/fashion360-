import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { notifyCustomer } from "@/lib/service-request-notify";
import { getScopedQuotation } from "@/app/api/quotations/[id]/route";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const quotation = await getScopedQuotation(businessId, id);

    const latest = await prisma.quotationVersion.findFirst({
      where: { quotationId: id, versionNumber: quotation.latestVersionNumber },
    });
    if (!latest) throw new ApiError(400, "No version to send");
    if (latest.status === "ACCEPTED") throw new ApiError(400, "This quotation is already accepted and locked");

    await prisma.$transaction(async (tx) => {
      await tx.quotationVersion.updateMany({
        where: { quotationId: id, status: "ACTIVE" },
        data: { status: "SUPERSEDED" },
      });
      await tx.quotationVersion.update({ where: { id: latest.id }, data: { status: "ACTIVE" } });
      await tx.quotation.update({
        where: { id },
        data: { status: "SENT", sentAt: new Date() },
      });

      await logFinancialTransaction(tx, {
        businessId,
        type: "QUOTATION_SENT",
        description: `Quotation ${quotation.quotationNumber} (version ${latest.versionNumber}) sent for review`,
        orderId: quotation.orderId,
        customerId: quotation.customerId,
        quotationId: id,
        previousStatus: quotation.status,
        newStatus: "SENT",
        actorType: "STAFF",
        actorId: session.user.id,
      });
    });

    await notifyFinancialEvent(prisma, {
      businessId,
      orderId: quotation.orderId,
      title: "Quotation sent",
      body: `${quotation.quotationNumber} was sent to the customer for review.`,
    });
    if (quotation.customerProfileId) {
      await notifyCustomer(prisma, {
        businessId,
        customerProfileId: quotation.customerProfileId,
        title: "Your quotation is ready",
        body: `${quotation.quotationNumber} is ready for your review.`,
        type: "info",
      });
    }

    const updated = await prisma.quotation.findUnique({ where: { id } });
    return NextResponse.json({ quotation: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
