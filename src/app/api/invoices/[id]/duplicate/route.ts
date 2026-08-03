import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { nextInvoiceNumber } from "@/lib/invoice-code";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { getScopedInvoice } from "@/app/api/invoices/[id]/route";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const invoice = await getScopedInvoice(businessId, id);
    const items = await prisma.invoiceItem.findMany({ where: { invoiceId: id }, orderBy: { sortOrder: "asc" } });

    const duplicate = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await nextInvoiceNumber(tx, businessId);
      const created = await tx.invoice.create({
        data: {
          businessId,
          orderId: invoice.orderId,
          customerId: invoice.customerId,
          invoiceNumber,
          status: "DRAFT",
          currency: invoice.currency,
          subtotal: invoice.subtotal,
          discount: invoice.discount,
          tax: invoice.tax,
          deliveryFee: invoice.deliveryFee,
          additionalCharges: invoice.additionalCharges,
          total: invoice.total,
          balanceDue: invoice.total,
          paymentInstructions: invoice.paymentInstructions,
          paymentTerms: invoice.paymentTerms,
          cancellationPolicy: invoice.cancellationPolicy,
          refundPolicy: invoice.refundPolicy,
          alterationPolicy: invoice.alterationPolicy,
          deliveryPolicy: invoice.deliveryPolicy,
          customTerms: invoice.customTerms,
          createdById: session.user.id,
          items: {
            create: items.map((item) => ({
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
        include: { items: true },
      });

      await logFinancialTransaction(tx, {
        businessId,
        type: "INVOICE_CREATED",
        description: `Invoice ${invoiceNumber} duplicated from ${invoice.invoiceNumber}`,
        orderId: invoice.orderId,
        customerId: invoice.customerId,
        invoiceId: created.id,
        actorType: "STAFF",
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ invoice: duplicate }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
