import type { Prisma, FinancialLineItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { nextQuotationNumber } from "@/lib/quotation-code";
import { logFinancialTransaction } from "@/lib/financial-transaction";

type Db = typeof prisma | Prisma.TransactionClient;

export async function loadCustomerQuotation(id: string, customerProfileId: string) {
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation || quotation.customerProfileId !== customerProfileId) throw new ApiError(404, "Quotation not found");
  return quotation;
}

export interface QuotationLineItemInput {
  type: FinancialLineItemType;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
}

// Matches the legacy staff quote-builder's math exactly (see
// quotations/[id]/versions/route.ts): subtotal is the gross sum of every
// item's quantity*unitPrice, and discount/tax are flat quote-level
// adjustments — NOT summed from each item's own discount/tax fields, which
// only feed that item's own displayed subtotal.
function calculateTotals(
  items: QuotationLineItemInput[],
  discount: number,
  tax: number,
  deliveryFee: number,
  additionalCharges: number
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal - discount + tax + deliveryFee + additionalCharges;
  return { subtotal, total };
}

// Part 1: the designer's "Create Quote" action against an approved, locked
// Design Project. Reuses the Quotation/QuotationVersion/QuotationItem
// machinery wholesale, just with orderId left null (backfilled once the
// quotation is accepted — see order-agreement.ts) and every bridge field
// copied straight off the DesignPreview it's quoting.
export async function createQuotationFromDesignProject(
  db: Db,
  params: {
    businessId: string;
    designPreviewId: string;
    items: QuotationLineItemInput[];
    discount?: number;
    tax?: number;
    deliveryFee?: number;
    additionalCharges?: number;
    depositPercentage?: number;
    depositRequired?: number;
    productionDays?: number;
    estimatedDeliveryDate?: Date | null;
    productionDeadline?: Date | null;
    paymentTerms?: string | null;
    includedRevisions?: number | null;
    additionalRevisionCost?: number | null;
    lateChangePolicy?: string | null;
    cancellationPolicy?: string | null;
    refundPolicy?: string | null;
    alterationPolicy?: string | null;
    deliveryPolicy?: string | null;
    customTerms?: string | null;
    createdById: string;
  }
) {
  const preview = await db.designPreview.findUniqueOrThrow({ where: { id: params.designPreviewId } });
  if (preview.status !== "DESIGN_LOCKED") throw new ApiError(400, "The design must be approved and locked before quoting");

  const existingActive = await db.quotation.findFirst({
    where: { designPreviewId: params.designPreviewId, status: { notIn: ["DECLINED", "CANCELLED", "ARCHIVED"] } },
  });
  if (existingActive) throw new ApiError(409, "An active quotation already exists for this design project");

  if (params.items.length === 0) throw new ApiError(400, "Add at least one line item");

  const deliveryFee = params.deliveryFee ?? 0;
  const additionalCharges = params.additionalCharges ?? 0;
  const discount = params.discount ?? 0;
  const tax = params.tax ?? 0;
  const { subtotal, total } = calculateTotals(params.items, discount, tax, deliveryFee, additionalCharges);
  const depositPercentage = params.depositPercentage ?? 0;
  const depositRequired = params.depositRequired ?? (total * depositPercentage) / 100;

  const quotationNumber = await nextQuotationNumber(db, params.businessId);

  const quotation = await db.quotation.create({
    data: {
      businessId: params.businessId,
      customerId: preview.customerId,
      customerProfileId: preview.customerProfileId,
      serviceRequestId: preview.serviceRequestId,
      designPreviewId: preview.id,
      measurementProfileId: preview.measurementProfileId,
      measurementVersionId: preview.measurementVersionId,
      quotationNumber,
      status: "DRAFT",
      latestVersionNumber: 1,
      createdById: params.createdById,
      versions: {
        create: {
          businessId: params.businessId,
          versionNumber: 1,
          status: "DRAFT",
          subtotal,
          discount,
          tax,
          deliveryFee,
          additionalCharges,
          total,
          depositPercentage,
          depositRequired,
          balanceDue: total - depositRequired,
          paymentTerms: params.paymentTerms,
          productionDays: params.productionDays,
          estimatedDeliveryDate: params.estimatedDeliveryDate,
          productionDeadline: params.productionDeadline,
          includedRevisions: params.includedRevisions,
          additionalRevisionCost: params.additionalRevisionCost,
          lateChangePolicy: params.lateChangePolicy,
          cancellationPolicy: params.cancellationPolicy,
          refundPolicy: params.refundPolicy,
          alterationPolicy: params.alterationPolicy,
          deliveryPolicy: params.deliveryPolicy,
          customTerms: params.customTerms,
          createdById: params.createdById,
          items: {
            create: params.items.map((item, index) => ({
              businessId: params.businessId,
              type: item.type,
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount ?? 0,
              tax: item.tax ?? 0,
              subtotal: Math.max(0, item.quantity * item.unitPrice - (item.discount ?? 0) + (item.tax ?? 0)),
              sortOrder: index,
            })),
          },
        },
      },
    },
    include: { versions: { include: { items: true } } },
  });

  await logFinancialTransaction(db, {
    businessId: params.businessId,
    type: "QUOTATION_CREATED",
    description: `Quotation ${quotationNumber} created for ${preview.name}`,
    customerId: preview.customerId,
    quotationId: quotation.id,
    amount: total,
    actorType: "STAFF",
    actorId: params.createdById,
  });

  return quotation;
}

