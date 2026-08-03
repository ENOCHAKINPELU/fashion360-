import type { Prisma, DesignApprovalDecision, DesignCommentAuthorType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logDesignActivity } from "@/lib/design-activity";
import { logOrderActivity } from "@/lib/order-activity";
import { markOrderTimelineStage } from "@/lib/order-timeline";
import { notifyDesignEvent } from "@/lib/design-notifications";
import { notifyCustomer } from "@/lib/service-request-notify";

type Db = typeof prisma | Prisma.TransactionClient;

// Shared by the legacy DesignShare-token flow, staff recording a decision
// taken outside the portal, AND (Phase 5) the new authenticated-customer
// flow — so the locking/versioning invariants only ever live in one place:
// approving always (a) creates one DesignApproval decision event, (b) on
// APPROVED marks that version APPROVED and every other ACTIVE version
// SUPERSEDED, (c) locks the preview, (d) writes exactly one
// DesignApprovalRecord, and (e) mirrors the outcome onto the Order via the
// existing timeline/activity helpers — only when orderId is present, since
// a Phase 5 pre-order Design Project has no Order yet.
export async function finalizeDesignDecision(
  tx: Db,
  params: {
    previewId: string;
    versionId: string;
    businessId: string;
    orderId?: string | null;
    measurementProfileId?: string | null;
    decision: DesignApprovalDecision;
    ipAddress?: string | null;
    userAgent?: string | null;
    recordedByType: DesignCommentAuthorType;
    recordedById?: string | null;
    customerProfileId?: string | null;
  }
) {
  await tx.designApproval.create({
    data: {
      previewId: params.previewId,
      businessId: params.businessId,
      versionId: params.versionId,
      decision: params.decision,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      customerProfileId: params.customerProfileId ?? null,
    },
  });

  const preview0 = await tx.designPreview.findUniqueOrThrow({ where: { id: params.previewId } });

  if (params.decision === "REJECTED") {
    await tx.designVersion.update({ where: { id: params.versionId }, data: { status: "REJECTED" } });
    const preview = await tx.designPreview.update({
      where: { id: params.previewId },
      data: { status: params.orderId ? "REJECTED" : "CHANGES_REQUESTED", rejectedAt: new Date() },
    });

    await logDesignActivity(tx, {
      previewId: params.previewId,
      businessId: params.businessId,
      type: "REJECTED",
      title: "Design rejected",
      actorType: params.recordedByType,
      actorId: params.recordedById,
    });

    if (params.orderId) {
      await logOrderActivity(tx, {
        orderId: params.orderId,
        businessId: params.businessId,
        type: "DESIGN_UPDATED",
        title: `Design "${preview.name}" rejected`,
      });
    }
    await notifyDesignEvent(tx, {
      businessId: params.businessId,
      orderId: params.orderId,
      assignedDesignerId: preview0.assignedDesignerId,
      title: "Design rejected",
      body: `${preview.name} was rejected and needs a new version.`,
      type: "danger",
    });

    return preview;
  }

  await tx.designVersion.updateMany({
    where: { previewId: params.previewId, status: "ACTIVE", NOT: { id: params.versionId } },
    data: { status: "SUPERSEDED" },
  });
  await tx.designVersion.update({ where: { id: params.versionId }, data: { status: "APPROVED" } });

  const preview = await tx.designPreview.update({
    where: { id: params.previewId },
    data: { status: params.orderId ? "LOCKED" : "DESIGN_LOCKED", approvedAt: new Date() },
  });

  const version = await tx.designVersion.findUniqueOrThrow({
    where: { id: params.versionId },
    include: { customization: true },
  });

  const measurementProfileId = params.orderId
    ? (await tx.order.findUniqueOrThrow({ where: { id: params.orderId }, select: { measurementProfileId: true } })).measurementProfileId
    : (params.measurementProfileId ?? null);

  // upsert, not create: DesignApprovalRecord.previewId is unique (one
  // "current approval" record per project), but a project can legitimately
  // be approved more than once over its life — e.g. a post-approval change
  // request (Part 28) creates a new version that itself needs approving.
  // A plain create() here would throw a unique-constraint error the second
  // time any project is re-approved.
  await tx.designApprovalRecord.upsert({
    where: { previewId: params.previewId },
    create: {
      previewId: params.previewId,
      businessId: params.businessId,
      approvedVersionId: params.versionId,
      customerId: preview0.customerId,
      customerProfileId: params.customerProfileId ?? null,
      designerConfirmedById: params.recordedByType === "STAFF" ? params.recordedById : null,
      customizationSummary: (version.customization ?? {}) as Prisma.InputJsonValue,
      measurementProfileId,
    },
    update: {
      approvedVersionId: params.versionId,
      customerProfileId: params.customerProfileId ?? null,
      designerConfirmedById: params.recordedByType === "STAFF" ? params.recordedById : null,
      customizationSummary: (version.customization ?? {}) as Prisma.InputJsonValue,
      measurementProfileId,
      approvedAt: new Date(),
    },
  });

  await logDesignActivity(tx, {
    previewId: params.previewId,
    businessId: params.businessId,
    type: "APPROVED",
    title: "Design approved by customer",
    actorType: params.recordedByType,
    actorId: params.recordedById,
  });
  await logDesignActivity(tx, {
    previewId: params.previewId,
    businessId: params.businessId,
    type: "LOCKED",
    title: `Version ${version.versionNumber} locked for production`,
    actorType: params.recordedByType,
    actorId: params.recordedById,
  });

  if (params.orderId) {
    await logOrderActivity(tx, {
      orderId: params.orderId,
      businessId: params.businessId,
      type: "DESIGN_APPROVED",
      title: `Design "${preview.name}" approved and locked`,
    });
    await markOrderTimelineStage(tx, {
      orderId: params.orderId,
      businessId: params.businessId,
      stage: "DESIGN_APPROVED",
      status: "COMPLETED",
    });
  }

  await notifyDesignEvent(tx, {
    businessId: params.businessId,
    orderId: params.orderId,
    assignedDesignerId: preview0.assignedDesignerId,
    title: "Design approved",
    body: `${preview.name} was approved by the customer and is locked for production.`,
    type: "success",
  });

  if (preview0.customerProfileId) {
    await notifyCustomer(tx, {
      businessId: params.businessId,
      customerProfileId: preview0.customerProfileId,
      title: "Design approved, locked for quotation",
      body: `Your design "${preview.name}" is now locked and ready for the next step.`,
      type: "success",
    });
  }

  return preview;
}
