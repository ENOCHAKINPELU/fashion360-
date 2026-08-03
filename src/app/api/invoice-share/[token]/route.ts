import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";
import { getInvoiceShareOrThrow } from "@/lib/invoice-share";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { notifyFinancialEvent } from "@/lib/financial-notifications";

// Public, token-authenticated bundle for the customer invoice/payment page.
// Hand-picks fields — never exposes gateway secrets or other customers'
// data — same convention as design-share and quotation-share.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getInvoiceShareOrThrow(token);
    const invoice = share.invoice;

    const [items, paymentSchedule, payments] = await Promise.all([
      prisma.invoiceItem.findMany({ where: { invoiceId: invoice.id }, orderBy: { sortOrder: "asc" } }),
      prisma.paymentSchedule.findUnique({
        where: { invoiceId: invoice.id },
        include: { milestones: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.payment.findMany({
        where: { invoiceId: invoice.id, status: "SUCCESSFUL" },
        orderBy: { createdAt: "desc" },
        include: { receipt: true },
      }),
    ]);

    const activeGateway = await prisma.paymentGatewayConnection.findFirst({
      where: { businessId: invoice.businessId, isActive: true, status: "CONNECTED" },
      select: { provider: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.invoiceShare.update({
        where: { id: share.id },
        data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
      });

      if (!invoice.firstViewedAt) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            firstViewedAt: new Date(),
            status: invoice.status === "SENT" ? "VIEWED" : invoice.status,
          },
        });
        await logFinancialTransaction(tx, {
          businessId: invoice.businessId,
          type: "INVOICE_VIEWED",
          description: `Customer viewed invoice ${invoice.invoiceNumber}`,
          orderId: invoice.orderId,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          actorType: "CUSTOMER",
        });
        await notifyFinancialEvent(tx, {
          businessId: invoice.businessId,
          orderId: invoice.orderId,
          title: "Customer viewed invoice",
          body: `${invoice.invoiceNumber} was viewed by the customer for the first time.`,
        });
      }
    });

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        currency: invoice.currency,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        tax: invoice.tax,
        deliveryFee: invoice.deliveryFee,
        additionalCharges: invoice.additionalCharges,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
        paymentInstructions: invoice.paymentInstructions,
        paymentTerms: invoice.paymentTerms,
        cancellationPolicy: invoice.cancellationPolicy,
        refundPolicy: invoice.refundPolicy,
        alterationPolicy: invoice.alterationPolicy,
        deliveryPolicy: invoice.deliveryPolicy,
        business: invoice.business,
        customer: invoice.customer,
        order: invoice.order,
      },
      items,
      paymentSchedule,
      payments,
      canPayOnline: Boolean(activeGateway),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
