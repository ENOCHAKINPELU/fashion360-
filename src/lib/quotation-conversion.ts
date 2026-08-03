import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { nextInvoiceNumber } from "@/lib/invoice-code";
import { getOrCreateFinancialSettings } from "@/lib/financial-settings";
import { logFinancialTransaction } from "@/lib/financial-transaction";

type Db = typeof prisma | Prisma.TransactionClient;

// Copies an accepted QuotationVersion's items/pricing/terms into a brand-new,
// independently-editable Invoice snapshot (the quotation itself is never
// mutated by conversion, only marked CONVERTED). Shared by the staff
// "Convert to Invoice" action and the platform-mediated order flow, which
// converts automatically the instant a pre-order quotation is accepted and
// its Order is created — see order-agreement.ts.
export async function convertQuotationToInvoice(
  tx: Db,
  params: { quotationId: string; businessId: string; orderId: string; actorId?: string | null }
) {
  const quotation = await tx.quotation.findUniqueOrThrow({ where: { id: params.quotationId } });
  const acceptedVersion = await tx.quotationVersion.findFirst({
    where: { quotationId: params.quotationId, status: "ACCEPTED" },
    include: { items: true },
  });
  if (!acceptedVersion) throw new ApiError(400, "No accepted version found on this quotation");

  const existingInvoice = await tx.invoice.findUnique({ where: { quotationId: params.quotationId } });
  if (existingInvoice) return existingInvoice;

  const [settings, business] = await Promise.all([
    getOrCreateFinancialSettings(tx, params.businessId),
    tx.business.findUniqueOrThrow({ where: { id: params.businessId }, select: { currency: true } }),
  ]);
  const dueDate = acceptedVersion.balanceDueDate ?? new Date(Date.now() + settings.invoiceDueDays * 24 * 60 * 60 * 1000);
  const invoiceNumber = await nextInvoiceNumber(tx, params.businessId);

  const invoice = await tx.invoice.create({
    data: {
      businessId: params.businessId,
      orderId: params.orderId,
      customerId: quotation.customerId,
      quotationId: params.quotationId,
      invoiceNumber,
      status: "DRAFT",
      currency: business.currency,
      dueDate,
      subtotal: acceptedVersion.subtotal,
      discount: acceptedVersion.discount,
      tax: acceptedVersion.tax,
      deliveryFee: acceptedVersion.deliveryFee,
      additionalCharges: acceptedVersion.additionalCharges,
      total: acceptedVersion.total,
      balanceDue: acceptedVersion.total,
      paymentTerms: acceptedVersion.paymentTerms,
      cancellationPolicy: acceptedVersion.cancellationPolicy,
      refundPolicy: acceptedVersion.refundPolicy,
      alterationPolicy: acceptedVersion.alterationPolicy,
      deliveryPolicy: acceptedVersion.deliveryPolicy,
      customTerms: acceptedVersion.customTerms,
      createdById: params.actorId,
      items: {
        create: acceptedVersion.items.map((item) => ({
          businessId: params.businessId,
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
      ...(acceptedVersion.depositRequired > 0
        ? {
            paymentSchedule: {
              create: {
                businessId: params.businessId,
                milestones: {
                  create: [
                    {
                      businessId: params.businessId,
                      label: "Deposit",
                      percentage: acceptedVersion.depositPercentage,
                      amount: acceptedVersion.depositRequired,
                      sortOrder: 0,
                    },
                    {
                      businessId: params.businessId,
                      label: "Balance",
                      percentage: 100 - acceptedVersion.depositPercentage,
                      amount: acceptedVersion.balanceDue,
                      dueDate,
                      sortOrder: 1,
                    },
                  ],
                },
              },
            },
          }
        : {}),
    },
    include: { items: true, paymentSchedule: { include: { milestones: true } } },
  });

  await tx.quotation.update({ where: { id: params.quotationId }, data: { status: "CONVERTED" } });

  await logFinancialTransaction(tx, {
    businessId: params.businessId,
    type: "QUOTATION_CONVERTED",
    description: `Quotation ${quotation.quotationNumber} converted to invoice ${invoiceNumber}`,
    orderId: params.orderId,
    customerId: quotation.customerId,
    quotationId: params.quotationId,
    invoiceId: invoice.id,
    amount: invoice.total,
    actorType: params.actorId ? "STAFF" : "SYSTEM",
    actorId: params.actorId,
  });
  await logFinancialTransaction(tx, {
    businessId: params.businessId,
    type: "INVOICE_CREATED",
    description: `Invoice ${invoiceNumber} created from quotation ${quotation.quotationNumber}`,
    orderId: params.orderId,
    customerId: quotation.customerId,
    invoiceId: invoice.id,
    amount: invoice.total,
    actorType: params.actorId ? "STAFF" : "SYSTEM",
    actorId: params.actorId,
  });

  return invoice;
}
