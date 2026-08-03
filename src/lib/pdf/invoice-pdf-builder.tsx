import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { InvoicePdfDocument } from "@/lib/pdf/invoice-pdf";
import { formatDate } from "@/lib/utils";

export async function buildInvoicePdfBuffer(invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId },
    include: {
      business: { select: { name: true, email: true, phone: true } },
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      order: { select: { orderCode: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) throw new ApiError(404, "Invoice not found");

  const businessContact = [invoice.business.email, invoice.business.phone].filter(Boolean).join(" · ");
  const customerContact = [invoice.customer.email, invoice.customer.phone].filter(Boolean).join(" · ");

  const buffer = await renderToBuffer(
    <InvoicePdfDocument
      businessName={invoice.business.name}
      businessContact={businessContact || undefined}
      customerName={`${invoice.customer.firstName} ${invoice.customer.lastName}`}
      customerContact={customerContact || undefined}
      invoiceNumber={invoice.invoiceNumber}
      status={invoice.status}
      issueDateLabel={formatDate(invoice.issueDate)}
      dueDateLabel={invoice.dueDate ? formatDate(invoice.dueDate) : undefined}
      orderCode={invoice.order.orderCode}
      items={invoice.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      }))}
      subtotal={invoice.subtotal}
      discount={invoice.discount}
      tax={invoice.tax}
      deliveryFee={invoice.deliveryFee}
      additionalCharges={invoice.additionalCharges}
      total={invoice.total}
      amountPaid={invoice.amountPaid}
      balanceDue={invoice.balanceDue}
      currency={invoice.currency}
      paymentInstructions={invoice.paymentInstructions ?? undefined}
      paymentTerms={invoice.paymentTerms ?? undefined}
    />
  );

  return { buffer, invoiceNumber: invoice.invoiceNumber };
}
