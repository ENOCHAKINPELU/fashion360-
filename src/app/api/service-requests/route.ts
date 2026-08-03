import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { serviceRequestSchema } from "@/lib/validations/service";
import { nextServiceRequestCode } from "@/lib/service-request-code";
import { notifyBusinessOwners } from "@/lib/service-request-notify";

// Part 11/15: the customer-initiated request that kicks off a new (or
// renewed) business relationship. Creating a request never touches
// BusinessCustomerRelationship directly — that only happens once both
// sides accept (see lib/business-customer-relationship.ts), so a declined
// or ignored request never silently creates a connection.
export async function POST(req: NextRequest) {
  try {
    const { profile } = await requireCustomerContext();
    const data = serviceRequestSchema.parse(await req.json());

    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
      include: { verification: true },
    });
    if (!business) throw new ApiError(404, "Business not found");
    if (business.verification?.status === "SUSPENDED") throw new ApiError(403, "This business isn't accepting requests right now");

    if (data.serviceId) {
      const service = await prisma.businessService.findUnique({ where: { id: data.serviceId } });
      if (!service || service.businessId !== business.id) throw new ApiError(400, "Invalid service selected");
    }

    const created = await prisma.$transaction(async (tx) => {
      const requestCode = await nextServiceRequestCode(tx, business.id);
      const request = await tx.serviceRequest.create({
        data: {
          businessId: business.id,
          customerProfileId: profile.id,
          serviceId: data.serviceId || null,
          requestCode,
          status: "SUBMITTED",
          preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
          preferredTime: data.preferredTime || null,
          locationPreference: data.locationPreference || null,
          description: data.description,
          budgetMin: data.budgetMin || null,
          budgetMax: data.budgetMax || null,
          additionalNotes: data.additionalNotes || null,
          attachments: { create: data.attachmentUrls.map((imageUrl) => ({ imageUrl })) },
        },
      });

      await tx.serviceRequestStatusHistory.create({ data: { serviceRequestId: request.id, status: "SUBMITTED" } });

      await notifyBusinessOwners(tx, {
        businessId: business.id,
        title: "New service request",
        body: `A customer requested "${data.description.slice(0, 60)}${data.description.length > 60 ? "…" : ""}"`,
        type: "info",
      });

      return request;
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
