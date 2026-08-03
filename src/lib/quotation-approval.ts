import type { Prisma, QuotationApprovalDecision, FinancialActorType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { markOrderTimelineStage } from "@/lib/order-timeline";

type Db = typeof prisma | Prisma.TransactionClient;

// Shared by both the customer (via a QuotationShare token) and staff
// (recording a decision taken outside the portal) so the
// locking/versioning invariants only ever live in one place: deciding
// always (a) creates one QuotationApproval decision event, (b) on ACCEPTED
// marks that version ACCEPTED and every other ACTIVE version SUPERSEDED,
// (c) marks the quotation ACCEPTED/DECLINED, and (d) logs + notifies.
// Never overwrites an accepted quotation — see the Prisma schema comment on
// QuotationVersion for the same invariant Phase 7 established for designs.
export async function finalizeQuotationDecision(
  tx: Db,
  params: {
    quotationId: string;
    versionId: string;
    businessId: string;
    // Nullable so a quotation created straight from an approved DesignPreview
    // (no Order yet) can go through the same accept/decline logic — see
    // DesignPreview's own finalizeDesignDecision for the identical pattern.
    orderId?: string | null;
    decision: QuotationApprovalDecision;
    ipAddress?: string | null;
    userAgent?: string | null;
    actorType: FinancialActorType;
    actorId?: string | null;
    customerProfileId?: string | null;
  }
) {
  await tx.quotationApproval.create({
    data: {
      quotationId: params.quotationId,
      businessId: params.businessId,
      versionId: params.versionId,
      decision: params.decision,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      customerProfileId: params.customerProfileId ?? null,
    },
  });

  if (params.decision === "DECLINED") {
    await tx.quotationVersion.update({ where: { id: params.versionId }, data: { status: "DECLINED" } });
    const quotation = await tx.quotation.update({
      where: { id: params.quotationId },
      data: { status: "DECLINED", declinedAt: new Date() },
    });

    await logFinancialTransaction(tx, {
      businessId: params.businessId,
      type: "QUOTATION_DECLINED",
      description: `Quotation ${quotation.quotationNumber} declined`,
      orderId: params.orderId,
      customerId: quotation.customerId,
      quotationId: params.quotationId,
      previousStatus: "SENT",
      newStatus: "DECLINED",
      actorType: params.actorType,
      actorId: params.actorId,
    });
    await notifyFinancialEvent(tx, {
      businessId: params.businessId,
      orderId: params.orderId,
      title: "Quotation declined",
      body: `${quotation.quotationNumber} was declined and needs a new version.`,
      type: "danger",
    });

    return quotation;
  }

  await tx.quotationVersion.updateMany({
    where: { quotationId: params.quotationId, status: "ACTIVE", NOT: { id: params.versionId } },
    data: { status: "SUPERSEDED" },
  });
  await tx.quotationVersion.update({ where: { id: params.versionId }, data: { status: "ACCEPTED" } });

  const quotation = await tx.quotation.update({
    where: { id: params.quotationId },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });

  await logFinancialTransaction(tx, {
    businessId: params.businessId,
    type: "QUOTATION_ACCEPTED",
    description: `Quotation ${quotation.quotationNumber} accepted`,
    orderId: params.orderId,
    customerId: quotation.customerId,
    quotationId: params.quotationId,
    previousStatus: "SENT",
    newStatus: "ACCEPTED",
    actorType: params.actorType,
    actorId: params.actorId,
  });
  if (params.orderId) {
    await markOrderTimelineStage(tx, {
      orderId: params.orderId,
      businessId: params.businessId,
      stage: "QUOTATION_CREATED",
      status: "COMPLETED",
    });
  }
  await notifyFinancialEvent(tx, {
    businessId: params.businessId,
    orderId: params.orderId,
    title: "Quotation accepted",
    body: `${quotation.quotationNumber} was accepted by the customer. You can now convert it to an invoice.`,
    type: "success",
  });

  return quotation;
}
