import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

// Called client-side on mount when a business opens a request's detail
// view — idempotent, only advances SUBMITTED -> RECEIVED and only sets
// viewedAt once, so re-opening an already-viewed request is a no-op.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request || request.businessId !== businessId) throw new ApiError(404, "Service request not found");

    if (request.viewedAt) return NextResponse.json({ request });

    const updated = await prisma.$transaction(async (tx) => {
      const nextStatus = request.status === "SUBMITTED" ? "RECEIVED" : request.status;
      const result = await tx.serviceRequest.update({ where: { id }, data: { viewedAt: new Date(), status: nextStatus } });
      if (nextStatus !== request.status) {
        await tx.serviceRequestStatusHistory.create({ data: { serviceRequestId: id, status: nextStatus } });
      }
      return result;
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
