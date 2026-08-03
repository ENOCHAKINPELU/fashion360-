import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { measurementAccessRequestSchema } from "@/lib/validations/measurement";
import { notifyCustomer } from "@/lib/service-request-notify";

// Part 22/23: the business asking "Access your measurement profile" —
// targets the customer (not a specific profile the business can't see yet;
// the customer picks which profile to share when they approve).
export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = measurementAccessRequestSchema.parse(await req.json());

    const relationship = await prisma.businessCustomerRelationship.findUnique({
      where: { businessId_customerProfileId: { businessId, customerProfileId: data.customerProfileId } },
    });
    if (!relationship || relationship.status !== "ACTIVE") {
      throw new ApiError(403, "You can only request measurement access from an actively connected customer");
    }

    const existing = await prisma.measurementAccessRequest.findFirst({
      where: { businessId, customerProfileId: data.customerProfileId, status: "PENDING" },
    });
    if (existing) throw new ApiError(409, "You already have a pending access request with this customer");

    const request = await prisma.$transaction(async (tx) => {
      const result = await tx.measurementAccessRequest.create({
        data: {
          businessId,
          customerProfileId: data.customerProfileId,
          reason: data.reason,
          serviceRequestId: data.serviceRequestId || null,
          requestedById: session.user.id,
        },
      });
      await notifyCustomer(tx, {
        businessId,
        customerProfileId: data.customerProfileId,
        title: "A business requested access to your measurements",
        body: data.reason,
        type: "info",
      });
      return result;
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
