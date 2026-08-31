import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { businessResponseSchema } from "@/lib/validations/service";
import { notifyCustomer } from "@/lib/service-request-notify";

const TERMINAL: string[] = ["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED", "CONVERTED_TO_APPOINTMENT", "CONVERTED_TO_ORDER"];

const RESPONSE_LABEL: Record<string, string> = {
  ACCEPTED: "accepted your request",
  DECLINED: "declined your request",
  INFO_REQUESTED: "asked for more information",
  ALTERNATIVE_DATE_PROPOSED: "proposed a different date",
  MESSAGE: "sent a message",
};

// Part 13/14: the business's single response endpoint — `type` carries what
// would otherwise be four near-identical routes (accept/decline/request-
// info/propose-date). ACCEPTED does not finalize the request on its own;
// Part 15 requires the customer's own accept before it becomes ACCEPTED /
// the relationship activates (see /api/service-requests/[id]/respond).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const data = businessResponseSchema.parse(await req.json());

    const request = await prisma.serviceRequest.findUnique({ where: { id }, include: { business: { select: { name: true } } } });
    if (!request || request.businessId !== businessId) throw new ApiError(404, "Service request not found");
    if (TERMINAL.includes(request.status)) throw new ApiError(400, "This request has already been resolved");

    const nextStatus = data.type === "DECLINED" ? "DECLINED" : "UNDER_REVIEW";
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.serviceRequestResponse.create({
        data: {
          serviceRequestId: id,
          actorType: "BUSINESS",
          authorId: session.user.id,
          type: data.type,
          message: data.message || null,
          proposedDate: data.proposedDate ? new Date(data.proposedDate) : null,
          estimatedPriceMin: data.estimatedPriceMin || null,
          estimatedPriceMax: data.estimatedPriceMax || null,
        },
      });

      const result = await tx.serviceRequest.update({
        where: { id },
        data: { status: nextStatus, businessRespondedAt: request.businessRespondedAt ?? now, viewedAt: request.viewedAt ?? now },
      });

      if (nextStatus !== request.status) {
        await tx.serviceRequestStatusHistory.create({ data: { serviceRequestId: id, status: nextStatus } });
      }

      await notifyCustomer(tx, {
        businessId,
        customerProfileId: request.customerProfileId,
        title: "A business responded to your request",
        body: `${request.business.name} ${RESPONSE_LABEL[data.type] ?? "responded"}.`,
        type: data.type === "ACCEPTED" ? "success" : data.type === "DECLINED" ? "warning" : "info",
        event: data.type === "ACCEPTED" ? "REQUEST_ACCEPTED" : undefined,
      });

      return result;
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
