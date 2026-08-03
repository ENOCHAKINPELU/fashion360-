import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { quotationVersionInputSchema } from "@/lib/validations/quotation";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { getScopedQuotation } from "@/app/api/quotations/[id]/route";
import { getOrCreateFinancialSettings } from "@/lib/financial-settings";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const quotation = await getScopedQuotation(businessId, id);

    const data = quotationVersionInputSchema.parse(await req.json());
    const settings = await getOrCreateFinancialSettings(prisma, businessId);
    const versionNumber = quotation.latestVersionNumber + 1;

    const items = data.items.map((item, index) => ({
      type: item.type,
      name: item.name,
      description: item.description || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      tax: item.tax,
      subtotal: item.quantity * item.unitPrice - item.discount + item.tax,
      sortOrder: index,
      businessId,
    }));
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const total = subtotal - data.discount + data.tax + data.deliveryFee + data.additionalCharges;
    const depositRequired = (total * data.depositPercentage) / 100;
    const balanceDue = total - depositRequired;

    const version = await prisma.$transaction(async (tx) => {
      const created = await tx.quotationVersion.create({
        data: {
          quotationId: id,
          businessId,
          versionNumber,
          status: "DRAFT",
          subtotal,
          discount: data.discount,
          tax: data.tax,
          deliveryFee: data.deliveryFee,
          additionalCharges: data.additionalCharges,
          total,
          depositPercentage: data.depositPercentage,
          depositRequired,
          balanceDue,
          paymentTerms: data.paymentTerms || settings.defaultPaymentTerms,
          balanceDueDate: data.balanceDueDate,
          productionStartConditions: data.productionStartConditions,
          cancellationPolicy: data.cancellationPolicy || settings.defaultCancellationPolicy,
          refundPolicy: data.refundPolicy || settings.defaultRefundPolicy,
          alterationPolicy: data.alterationPolicy || settings.defaultAlterationPolicy,
          deliveryPolicy: data.deliveryPolicy || settings.defaultDeliveryPolicy,
          customTerms: data.customTerms,
          changesSummary: data.changesSummary,
          notes: data.notes,
          createdById: session.user.id,
          items: { create: items },
        },
        include: { items: true },
      });

      await tx.quotation.update({
        where: { id },
        data: { latestVersionNumber: versionNumber, status: "DRAFT" },
      });

      await logFinancialTransaction(tx, {
        businessId,
        type: "QUOTATION_CREATED",
        description: `Quotation ${quotation.quotationNumber} revised to version ${versionNumber}`,
        orderId: quotation.orderId,
        customerId: quotation.customerId,
        quotationId: id,
        actorType: "STAFF",
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
