import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";

const TERMINAL: string[] = ["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED", "CONVERTED_TO_APPOINTMENT", "CONVERTED_TO_ORDER"];

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireCustomerContext();
    const { id } = await params;

    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request || request.customerProfileId !== profile.id) throw new ApiError(404, "Service request not found");
    if (TERMINAL.includes(request.status)) throw new ApiError(400, "This request can no longer be cancelled");

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.serviceRequest.update({ where: { id }, data: { status: "CANCELLED" } });
      await tx.serviceRequestStatusHistory.create({ data: { serviceRequestId: id, status: "CANCELLED" } });
      return result;
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
