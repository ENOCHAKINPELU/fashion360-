import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { getQuotationShareOrThrow } from "@/lib/quotation-share";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { notifyFinancialEvent } from "@/lib/financial-notifications";

// Public, token-authenticated bundle for the customer quotation review page.
// Hand-picks fields rather than reusing the staff detail include, so
// private/internal data (other share tokens, full activity log) can never
// leak through this route — same convention as design-share's GET route.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getQuotationShareOrThrow(token);
    const quotation = share.quotation;
    // Share tokens only ever exist for the legacy order-anchored flow — a
    // quotation created straight from a Design Project is reviewed through
    // the authenticated /api/customer/quotations routes instead.
    if (!quotation.orderId) throw new ApiError(404, "This quotation link is invalid");

    const [versions, comments, revisionRequests] = await Promise.all([
      prisma.quotationVersion.findMany({
        where: { quotationId: quotation.id },
        orderBy: { versionNumber: "desc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.quotationComment.findMany({
        where: { quotationId: quotation.id },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      }),
      prisma.quotationRevisionRequest.findMany({ where: { quotationId: quotation.id }, orderBy: { createdAt: "desc" } }),
    ]);

    await prisma.$transaction(async (tx) => {
      await tx.quotationShare.update({
        where: { id: share.id },
        data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
      });

      if (!quotation.firstViewedAt) {
        await tx.quotation.update({
          where: { id: quotation.id },
          data: {
            firstViewedAt: new Date(),
            status: quotation.status === "SENT" ? "VIEWED" : quotation.status,
          },
        });
        await logFinancialTransaction(tx, {
          businessId: quotation.businessId,
          type: "QUOTATION_VIEWED",
          description: `Customer viewed quotation ${quotation.quotationNumber}`,
          orderId: quotation.orderId,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          actorType: "CUSTOMER",
        });
        await notifyFinancialEvent(tx, {
          businessId: quotation.businessId,
          orderId: quotation.orderId,
          title: "Customer viewed quotation",
          body: `${quotation.quotationNumber} was viewed by the customer for the first time.`,
        });
      }
    });

    return NextResponse.json({
      quotation: {
        id: quotation.id,
        quotationNumber: quotation.quotationNumber,
        status: quotation.status,
        latestVersionNumber: quotation.latestVersionNumber,
        expiresAt: quotation.expiresAt,
        business: quotation.business,
        customer: quotation.customer,
        order: quotation.order,
      },
      versions,
      comments,
      revisionRequests,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
