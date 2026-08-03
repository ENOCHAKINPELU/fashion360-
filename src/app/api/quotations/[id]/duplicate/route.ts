import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { nextQuotationNumber } from "@/lib/quotation-code";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { getScopedQuotation } from "@/app/api/quotations/[id]/route";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const quotation = await getScopedQuotation(businessId, id);

    const latest = await prisma.quotationVersion.findFirst({
      where: { quotationId: id, versionNumber: quotation.latestVersionNumber },
      include: { items: true },
    });
    if (!latest) throw new ApiError(400, "Nothing to duplicate");

    const duplicate = await prisma.$transaction(async (tx) => {
      const quotationNumber = await nextQuotationNumber(tx, businessId);
      const created = await tx.quotation.create({
        data: {
          businessId,
          orderId: quotation.orderId,
          customerId: quotation.customerId,
          quotationNumber,
          status: "DRAFT",
          latestVersionNumber: 1,
          createdById: session.user.id,
          versions: {
            create: {
              businessId,
              versionNumber: 1,
              status: "DRAFT",
              subtotal: latest.subtotal,
              discount: latest.discount,
              tax: latest.tax,
              deliveryFee: latest.deliveryFee,
              additionalCharges: latest.additionalCharges,
              total: latest.total,
              depositPercentage: latest.depositPercentage,
              depositRequired: latest.depositRequired,
              balanceDue: latest.balanceDue,
              paymentTerms: latest.paymentTerms,
              productionStartConditions: latest.productionStartConditions,
              cancellationPolicy: latest.cancellationPolicy,
              refundPolicy: latest.refundPolicy,
              alterationPolicy: latest.alterationPolicy,
              deliveryPolicy: latest.deliveryPolicy,
              customTerms: latest.customTerms,
              notes: latest.notes,
              createdById: session.user.id,
              items: {
                create: latest.items.map((item) => ({
                  businessId,
                  type: item.type,
                  name: item.name,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  discount: item.discount,
                  tax: item.tax,
                  subtotal: item.subtotal,
                  sortOrder: item.sortOrder,
                })),
              },
            },
          },
        },
        include: { versions: { include: { items: true } } },
      });

      await logFinancialTransaction(tx, {
        businessId,
        type: "QUOTATION_CREATED",
        description: `Quotation ${quotationNumber} duplicated from ${quotation.quotationNumber}`,
        orderId: quotation.orderId,
        customerId: quotation.customerId,
        quotationId: created.id,
        actorType: "STAFF",
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ quotation: duplicate }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
