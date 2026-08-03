import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { nextDesignPreviewCode } from "@/lib/design-preview-code";
import { logDesignActivity } from "@/lib/design-activity";
import { notifyDesignEvent } from "@/lib/design-notifications";
import { notifyCustomer } from "@/lib/service-request-notify";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 20/31: the single access gate for the new pre-order Design Project
// flow. A DesignPreview with orderId set belongs to the legacy flow and is
// gated by requireBusinessContext()/DesignShare tokens instead — this only
// ever loads rows created through the new path.
export async function loadBusinessDesignProject(id: string, businessId: string) {
  const project = await prisma.designPreview.findUnique({ where: { id } });
  if (!project || project.businessId !== businessId) throw new ApiError(404, "Design project not found");
  return project;
}

export async function loadCustomerDesignProject(id: string, customerProfileId: string) {
  const project = await prisma.designPreview.findUnique({ where: { id } });
  if (!project || project.customerProfileId !== customerProfileId) throw new ApiError(404, "Design project not found");
  return project;
}

// Part 3: a business (designer) creates the project once a Service Request
// has been accepted — reuses DesignPreview as the container (see the
// model's own doc comment for why), just with orderId/orderItemId left
// null. Also seeds an empty DesignBrief so the customer always has
// somewhere to write into immediately.
export async function createDesignProject(
  db: Db,
  params: {
    businessId: string;
    customerId: string; // bridged CRM Customer.id — see ensureLinkedCrmCustomer
    customerProfileId: string;
    serviceRequestId: string;
    appointmentId?: string | null;
    measurementProfileId?: string | null;
    measurementVersionId?: string | null;
    assignedDesignerId?: string | null;
    name: string;
    description?: string | null;
    category?: string | null;
    createdById: string;
  }
) {
  const previewCode = await nextDesignPreviewCode(db, params.businessId);

  const project = await db.designPreview.create({
    data: {
      businessId: params.businessId,
      customerId: params.customerId,
      customerProfileId: params.customerProfileId,
      serviceRequestId: params.serviceRequestId,
      appointmentId: params.appointmentId ?? null,
      measurementProfileId: params.measurementProfileId ?? null,
      measurementVersionId: params.measurementVersionId ?? null,
      assignedDesignerId: params.assignedDesignerId ?? null,
      previewCode,
      name: params.name,
      description: params.description ?? null,
      category: params.category ?? null,
      status: "DRAFT",
      createdById: params.createdById,
      brief: { create: {} },
    },
  });

  await logDesignActivity(db, {
    previewId: project.id,
    businessId: params.businessId,
    type: "CREATED",
    title: "Design project created",
    actorType: "STAFF",
    actorId: params.createdById,
  });

  await notifyCustomer(db, {
    businessId: params.businessId,
    customerProfileId: params.customerProfileId,
    title: "Your design project has started",
    body: `${params.name} is now in progress. Share your design brief to help your designer get started.`,
    type: "info",
  });

  return project;
}

// Part 10/26: designer submits -> customer notified, status flips to
// CUSTOMER_REVIEW (fresh project) or back to CUSTOMER_REVIEW after a
// revision (REVISION_IN_PROGRESS -> REVISION_SUBMITTED conceptually, but a
// single CUSTOMER_REVIEW status is what actually gates the customer's
// Review action either way — see getDesignProjectAwaitingActor).
export async function submitDesignVersionForReview(
  db: Db,
  params: { previewId: string; businessId: string; versionId: string; actorId: string; isRevision: boolean }
) {
  await db.designVersion.updateMany({
    where: { previewId: params.previewId, status: "ACTIVE", NOT: { id: params.versionId } },
    data: { status: "SUPERSEDED" },
  });
  await db.designVersion.update({ where: { id: params.versionId }, data: { status: "ACTIVE" } });

  const preview = await db.designPreview.update({
    where: { id: params.previewId },
    data: { status: "CUSTOMER_REVIEW", sentForReviewAt: new Date() },
  });

  await logDesignActivity(db, {
    previewId: params.previewId,
    businessId: params.businessId,
    type: params.isRevision ? "REVISION_SUBMITTED" : "SENT_FOR_REVIEW",
    title: params.isRevision ? "Revision submitted for review" : "Design submitted for review",
    actorType: "STAFF",
    actorId: params.actorId,
  });

  await notifyDesignEvent(db, {
    businessId: params.businessId,
    assignedDesignerId: preview.assignedDesignerId,
    title: params.isRevision ? "Revision submitted" : "Design submitted",
    body: `${preview.name} was submitted for customer review.`,
    type: "info",
  });

  if (preview.customerProfileId) {
    await notifyCustomer(db, {
      businessId: params.businessId,
      customerProfileId: preview.customerProfileId,
      title: params.isRevision ? "Your design revision is ready for review" : "Your design is ready for review",
      body: `${preview.name} is ready, take a look and let your designer know what you think.`,
      type: "info",
    });
  }

  return preview;
}
