import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { QuotationPdfDocument } from "@/lib/pdf/quotation-pdf";
import { formatDate } from "@/lib/utils";

// Shared by both the staff-side and customer-share PDF routes, each of
// which does its own authorization check before calling this.
export async function buildQuotationPdfBuffer(quotationId: string) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId },
    include: {
      business: { select: { name: true, email: true, phone: true, currency: true } },
      customer: { select: { firstName: true, lastName: true } },
      order: { select: { orderCode: true } },
    },
  });
  if (!quotation) throw new ApiError(404, "Quotation not found");

  const version = await prisma.quotationVersion.findFirst({
    where: { quotationId, versionNumber: quotation.latestVersionNumber },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!version) throw new ApiError(404, "Quotation version not found");

  const business = quotation.business;
  const businessContact = [business.email, business.phone].filter(Boolean).join(" · ");

  const buffer = await renderToBuffer(
    <QuotationPdfDocument
      businessName={business.name}
      businessContact={businessContact || undefined}
      customerName={`${quotation.customer.firstName} ${quotation.customer.lastName}`}
      quotationNumber={quotation.quotationNumber}
      status={quotation.status}
      createdAtLabel={formatDate(quotation.createdAt)}
      expiresAtLabel={quotation.expiresAt ? formatDate(quotation.expiresAt) : undefined}
      orderCode={quotation.order?.orderCode ?? quotation.quotationNumber}
      items={version.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      }))}
      subtotal={version.subtotal}
      discount={version.discount}
      tax={version.tax}
      deliveryFee={version.deliveryFee}
      additionalCharges={version.additionalCharges}
      total={version.total}
      depositRequired={version.depositRequired}
      balanceDue={version.balanceDue}
      currency={business.currency}
      paymentTerms={version.paymentTerms ?? undefined}
      cancellationPolicy={version.cancellationPolicy ?? undefined}
      refundPolicy={version.refundPolicy ?? undefined}
    />
  );

  return { buffer, quotationNumber: quotation.quotationNumber };
}
