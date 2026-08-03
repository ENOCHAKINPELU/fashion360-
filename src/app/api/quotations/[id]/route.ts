import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const QUOTATION_DETAIL_INCLUDE = {
  order: { select: { id: true, orderCode: true, totalValue: true, expectedCompletionDate: true, measurementProfileId: true } },
  customer: {
    select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, profilePhotoUrl: true },
  },
  versions: {
    orderBy: { versionNumber: "desc" as const },
    include: { createdBy: { select: { name: true } }, items: { orderBy: { sortOrder: "asc" as const } } },
  },
  comments: { orderBy: { createdAt: "asc" as const }, include: { author: { select: { name: true } } } },
  revisionRequests: { orderBy: { createdAt: "desc" as const } },
  approvals: { orderBy: { decidedAt: "desc" as const } },
  shares: { orderBy: { createdAt: "desc" as const } },
  invoice: { select: { id: true, invoiceNumber: true, status: true } },
} satisfies Prisma.QuotationInclude;

export async function getScopedQuotation(businessId: string, id: string) {
  const quotation = await prisma.quotation.findFirst({ where: { id, businessId } });
  if (!quotation) throw new ApiError(404, "Quotation not found");
  return quotation;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const quotation = await prisma.quotation.findFirst({
      where: { id, businessId },
      include: QUOTATION_DETAIL_INCLUDE,
    });
    if (!quotation) throw new ApiError(404, "Quotation not found");

    return NextResponse.json({ quotation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const patchSchema = z.object({ action: z.enum(["cancel", "archive"]) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const quotation = await getScopedQuotation(businessId, id);
    const { action } = patchSchema.parse(await req.json());

    if (action === "cancel" && (quotation.status === "ACCEPTED" || quotation.status === "CONVERTED")) {
      throw new ApiError(400, "This quotation has already been accepted and cannot be cancelled");
    }

    const status = action === "cancel" ? "CANCELLED" : "ARCHIVED";

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.quotation.update({
        where: { id },
        data: { status },
        include: QUOTATION_DETAIL_INCLUDE,
      });
      await logFinancialTransaction(tx, {
        businessId,
        type: action === "cancel" ? "QUOTATION_CANCELLED" : "QUOTATION_ARCHIVED",
        description: `Quotation ${quotation.quotationNumber} ${action === "cancel" ? "cancelled" : "archived"}`,
        orderId: quotation.orderId,
        customerId: quotation.customerId,
        quotationId: id,
        previousStatus: quotation.status,
        newStatus: status,
        actorType: "STAFF",
        actorId: session.user.id,
      });
      return result;
    });

    return NextResponse.json({ quotation: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
