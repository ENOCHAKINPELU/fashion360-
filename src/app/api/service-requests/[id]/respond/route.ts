import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { customerResponseSchema } from "@/lib/validations/service";
import { notifyBusinessOwners } from "@/lib/service-request-notify";
import { ensureActiveRelationship } from "@/lib/business-customer-relationship";
import { getServiceRequestAwaitingActor } from "@/lib/service-request-status";

// Part 14/15: the customer's side of the response thread — Accept/Decline/
// Continue Conversation. CUSTOMER_ACCEPTED is the only action that finalizes
// the request (status -> ACCEPTED) and activates the relationship; it's
// only allowed right after the business's own ACCEPTED response, mirroring
// Part 15's "Business Accepts -> Customer Accepts -> Relationship ACTIVE".
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile, session } = await requireCustomerContext();
    const { id } = await params;
    const data = customerResponseSchema.parse(await req.json());

    const request = await prisma.serviceRequest.findUnique({
      where: { id },
      include: { responses: true, business: { select: { name: true } } },
    });
    if (!request || request.customerProfileId !== profile.id) throw new ApiError(404, "Service request not found");

    const awaiting = getServiceRequestAwaitingActor(request.status, request.responses);

    if (data.type !== "MESSAGE" && awaiting !== "customer") {
      throw new ApiError(400, "There's nothing to respond to right now");
    }

    const lastBusinessResponse = [...request.responses]
      .filter((r) => r.actorType === "BUSINESS")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .at(-1);

    if (data.type === "CUSTOMER_ACCEPTED" && lastBusinessResponse?.type !== "ACCEPTED") {
      throw new ApiError(400, "The business hasn't accepted this request yet");
    }

    const nextStatus = data.type === "CUSTOMER_ACCEPTED" ? "ACCEPTED" : data.type === "CUSTOMER_DECLINED" ? "DECLINED" : request.status;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.serviceRequestResponse.create({
        data: {
          serviceRequestId: id,
          actorType: "CUSTOMER",
          authorId: session.user.id,
          type: data.type,
          message: data.message || null,
        },
      });

      const result = await tx.serviceRequest.update({
        where: { id },
        data: { status: nextStatus, customerRespondedAt: new Date() },
      });

      if (nextStatus !== request.status) {
        await tx.serviceRequestStatusHistory.create({ data: { serviceRequestId: id, status: nextStatus } });
      }

      if (data.type === "CUSTOMER_ACCEPTED") {
        await ensureActiveRelationship(tx, { businessId: request.businessId, customerProfileId: profile.id, actorUserId: session.user.id });
      }

      await notifyBusinessOwners(tx, {
        businessId: request.businessId,
        title:
          data.type === "CUSTOMER_ACCEPTED"
            ? "Customer accepted, you're now connected"
            : data.type === "CUSTOMER_DECLINED"
              ? "Customer declined your response"
              : "Customer replied to your response",
        body: `${session.user.name ?? "A customer"} responded to request ${request.requestCode}.`,
        type: data.type === "CUSTOMER_ACCEPTED" ? "success" : data.type === "CUSTOMER_DECLINED" ? "warning" : "info",
      });

      return result;
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
