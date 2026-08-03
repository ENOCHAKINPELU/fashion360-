import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { nextOrderCode } from "@/lib/order-code";
import { createOrderTimeline, markOrderTimelineStage } from "@/lib/order-timeline";
import { logOrderActivity } from "@/lib/order-activity";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { notifyCustomer } from "@/lib/service-request-notify";
import { convertQuotationToInvoice } from "@/lib/quotation-conversion";
import { recordOrderPlaced } from "@/lib/fashion-milestones";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 7/14: the instant a pre-order quotation (one created straight from a
// Design Project, no Order yet) is accepted, this does everything the spec's
// "Fashion360 Generates Order Agreement" step implies in one atomic move:
// creates the Order (bridged to the DesignPreview/ServiceRequest/
// Measurement Vault the quotation itself already carries), backfills
// Quotation.orderId, writes the immutable OrderAgreement contract snapshot,
// and converts the accepted version straight into an Invoice so the existing
// payment/webhook/ledger/receipt machinery can take over unchanged. Never
// called for a legacy quotation that already has an orderId — those convert
// to an invoice manually via the existing staff action.
export async function createOrderFromAcceptedQuotation(
  tx: Db,
  params: {
    quotationId: string;
    businessId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    actorId?: string | null;
  }
) {
  const quotation = await tx.quotation.findUniqueOrThrow({ where: { id: params.quotationId } });
  if (quotation.orderId) throw new ApiError(400, "This quotation already has an order");

  const acceptedVersion = await tx.quotationVersion.findFirst({
    where: { quotationId: params.quotationId, status: "ACCEPTED" },
  });
  if (!acceptedVersion) throw new ApiError(400, "No accepted version found on this quotation");

  const [designPreview, measurementVersion] = await Promise.all([
    quotation.designPreviewId
      ? tx.designPreview.findUnique({
          where: { id: quotation.designPreviewId },
          include: { approvalRecord: true },
        })
      : Promise.resolve(null),
    quotation.measurementVersionId ? tx.measurementVersion.findUnique({ where: { id: quotation.measurementVersionId } }) : Promise.resolve(null),
  ]);

  const orderCode = await nextOrderCode(tx, params.businessId);

  const order = await tx.order.create({
    data: {
      businessId: params.businessId,
      orderCode,
      customerId: quotation.customerId,
      customerProfileId: quotation.customerProfileId,
      serviceRequestId: quotation.serviceRequestId,
      designPreviewId: quotation.designPreviewId,
      passportMeasurementProfileId: quotation.measurementProfileId,
      measurementVersionId: quotation.measurementVersionId,
      measurementSnapshot: (measurementVersion?.values as Prisma.InputJsonValue | undefined) ?? undefined,
      orderType: "BESPOKE",
      status: "AWAITING_PAYMENT",
      assignedDesignerId: designPreview?.assignedDesignerId ?? null,
      subtotal: acceptedVersion.subtotal,
      discount: acceptedVersion.discount,
      tax: acceptedVersion.tax,
      deliveryFee: acceptedVersion.deliveryFee,
      totalValue: acceptedVersion.total,
      depositRequired: acceptedVersion.depositRequired,
      balanceDue: acceptedVersion.total,
      expectedCompletionDate: acceptedVersion.estimatedDeliveryDate,
      items: {
        create: {
          businessId: params.businessId,
          isCustomDesign: true,
          designNameSnapshot: designPreview?.name ?? quotation.quotationNumber,
          designCategorySnapshot: designPreview?.category ?? null,
          customDesignDescription: designPreview?.description ?? null,
          quantity: 1,
          basePrice: acceptedVersion.subtotal,
          subtotal: acceptedVersion.subtotal,
        },
      },
    },
  });

  await tx.quotation.update({ where: { id: params.quotationId }, data: { orderId: order.id } });

  await createOrderTimeline(tx, { orderId: order.id, businessId: params.businessId, orderType: "BESPOKE", actorId: params.actorId });
  const preCompletedStages = ["MEASUREMENTS_CONFIRMED", "DESIGN_SELECTED", "DESIGN_CUSTOMIZED", "DESIGN_APPROVED", "QUOTATION_CREATED"] as const;
  await Promise.all(
    preCompletedStages.map((stage) =>
      markOrderTimelineStage(tx, { orderId: order.id, businessId: params.businessId, stage, status: "COMPLETED", actorId: params.actorId })
    )
  );

  const agreement = await tx.orderAgreement.create({
    data: {
      businessId: params.businessId,
      orderId: order.id,
      quotationId: params.quotationId,
      quotationVersionId: acceptedVersion.id,
      customerId: quotation.customerId,
      customerProfileId: quotation.customerProfileId,
      designPreviewId: quotation.designPreviewId,
      designVersionId: designPreview?.approvalRecord?.approvedVersionId ?? null,
      measurementProfileId: quotation.measurementProfileId,
      measurementVersionId: quotation.measurementVersionId,
      totalPrice: acceptedVersion.total,
      currency: "NGN",
      deliveryEstimate: acceptedVersion.estimatedDeliveryDate,
      productionDeadline: acceptedVersion.productionDeadline,
      paymentTerms: acceptedVersion.paymentTerms,
      cancellationPolicy: acceptedVersion.cancellationPolicy,
      refundPolicy: acceptedVersion.refundPolicy,
      alterationPolicy: acceptedVersion.alterationPolicy,
      deliveryPolicy: acceptedVersion.deliveryPolicy,
      customTerms: acceptedVersion.customTerms,
      customerAcceptedAt: quotation.acceptedAt ?? new Date(),
      customerIpAddress: params.ipAddress,
      customerUserAgent: params.userAgent,
      // The business's binding offer was made the moment it sent the
      // quotation — accepting a SENT quote is mutual agreement, not a
      // separate manual counter-sign step.
      businessAcceptedAt: quotation.sentAt ?? new Date(),
      businessAcceptedById: quotation.createdById,
    },
  });

  const invoice = await convertQuotationToInvoice(tx, {
    quotationId: params.quotationId,
    businessId: params.businessId,
    orderId: order.id,
    actorId: params.actorId,
  });

  await logOrderActivity(tx, {
    orderId: order.id,
    businessId: params.businessId,
    type: "ORDER_CREATED",
    title: `Order created from accepted quotation ${quotation.quotationNumber}`,
    actorId: params.actorId,
  });
  await logFinancialTransaction(tx, {
    businessId: params.businessId,
    type: "ORDER_AGREEMENT_GENERATED",
    description: `Order agreement generated for order ${order.orderCode}`,
    orderId: order.id,
    customerId: quotation.customerId,
    quotationId: params.quotationId,
    amount: acceptedVersion.total,
    actorType: params.actorId ? "STAFF" : "CUSTOMER",
    actorId: params.actorId,
  });

  await Promise.all([
    notifyFinancialEvent(tx, {
      businessId: params.businessId,
      orderId: order.id,
      assignedDesignerId: designPreview?.assignedDesignerId,
      title: "Order agreement generated",
      body: `${quotation.quotationNumber} was accepted, order ${order.orderCode} is ready for payment.`,
      type: "success",
    }),
    quotation.customerProfileId
      ? notifyCustomer(tx, {
          businessId: params.businessId,
          customerProfileId: quotation.customerProfileId,
          title: "Your order agreement is ready",
          body: `Order ${order.orderCode} has been created. Complete payment to secure your order.`,
          type: "success",
        })
      : Promise.resolve(),
    quotation.customerProfileId
      ? recordOrderPlaced(tx, { customerProfileId: quotation.customerProfileId, businessId: params.businessId, orderCode: order.orderCode, designName: designPreview?.name ?? null })
      : Promise.resolve(),
  ]);

  return { order, agreement, invoice };
}
