import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designProjectCreateSchema } from "@/lib/validations/design-project";
import { createDesignProject } from "@/lib/design-project";
import { ensureLinkedCrmCustomer } from "@/lib/business-customer-relationship";

// Part 3: designer-initiated — a Design Project always starts from an
// ACCEPTED Service Request (the point at which Part 2's flow says
// "Measurements Confirmed -> Design Project Created"). Reuses the same
// linked-CRM-Customer bridge Phase 4 established for Appointments, so
// preview.customerId is always populated exactly like the legacy flow.
export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = designProjectCreateSchema.parse(await req.json());

    const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: data.serviceRequestId } });
    if (!serviceRequest || serviceRequest.businessId !== businessId) throw new ApiError(404, "Service request not found");
    if (serviceRequest.status !== "ACCEPTED") throw new ApiError(400, "This service request hasn't been accepted yet");

    const existing = await prisma.designPreview.findFirst({ where: { serviceRequestId: data.serviceRequestId } });
    if (existing) throw new ApiError(409, "A design project already exists for this service request");

    const relationship = await prisma.businessCustomerRelationship.findUnique({
      where: { businessId_customerProfileId: { businessId, customerProfileId: serviceRequest.customerProfileId } },
    });
    if (!relationship || relationship.status !== "ACTIVE") throw new ApiError(403, "No active relationship with this customer");

    if (data.assignedDesignerId) {
      const designer = await prisma.user.findUnique({ where: { id: data.assignedDesignerId } });
      if (!designer || designer.businessId !== businessId) throw new ApiError(400, "Invalid designer");
    }

    // Pull in whichever Measurement Vault profile is currently shared with
    // this business, if any — Part 3 wants the project linked to the
    // measurement profile/version actually used.
    const sharedMeasurement = await prisma.passportMeasurementProfile.findFirst({
      where: { customerProfileId: serviceRequest.customerProfileId, accessGrants: { some: { businessId, revokedAt: null } } },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    const project = await prisma.$transaction(async (tx) => {
      const customerId = await ensureLinkedCrmCustomer(tx, relationship);
      return createDesignProject(tx, {
        businessId,
        customerId,
        customerProfileId: serviceRequest.customerProfileId,
        serviceRequestId: serviceRequest.id,
        appointmentId: null,
        measurementProfileId: sharedMeasurement?.id ?? null,
        measurementVersionId: sharedMeasurement?.currentVersionId ?? null,
        assignedDesignerId: data.assignedDesignerId || null,
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        createdById: session.user.id,
      });
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
