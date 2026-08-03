import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { ReceiptPdfDocument } from "@/lib/pdf/receipt-pdf";
import { formatDate } from "@/lib/utils";

export async function buildReceiptPdfBuffer(receiptId: string) {
  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId },
    include: {
      business: { select: { name: true } },
      payment: {
        include: {
          customer: { select: { firstName: true, lastName: true } },
          invoice: { select: { invoiceNumber: true, balanceDue: true } },
          order: { select: { orderCode: true } },
        },
      },
    },
  });
  if (!receipt) throw new ApiError(404, "Receipt not found");

  const { payment } = receipt;
  const buffer = await renderToBuffer(
    <ReceiptPdfDocument
      businessName={receipt.business.name}
      receiptNumber={receipt.receiptNumber}
      customerName={`${payment.customer.firstName} ${payment.customer.lastName}`}
      amount={payment.amount}
      currency={payment.currency}
      method={payment.method}
      paymentDateLabel={formatDate(payment.paidAt ?? payment.createdAt)}
      invoiceNumber={payment.invoice.invoiceNumber}
      orderCode={payment.order.orderCode}
      remainingBalance={payment.invoice.balanceDue}
    />
  );

  return { buffer, receiptNumber: receipt.receiptNumber };
}
