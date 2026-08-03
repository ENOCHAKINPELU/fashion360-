import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { fittingSessionUpdateSchema } from "@/lib/validations/order";
import { logOrderActivity } from "@/lib/order-activity";
import { markOrderTimelineStage } from "@/lib/order-timeline";
import { getScopedOrder } from "@/app/api/orders/[id]/route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fittingId: string }> }
) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id, fittingId } = await params;
    await getScopedOrder(businessId, id);

    const existing = await prisma.fittingSession.findFirst({ where: { id: fittingId, orderId: id } });
    if (!existing) throw new ApiError(404, "Fitting session not found");

    const data = fittingSessionUpdateSchema.parse(await req.json());

    const fittingSession = await prisma.$transaction(async (tx) => {
      const updated = await tx.fittingSession.update({
        where: { id: fittingId },
        data: {
          ...(data.fittingDate !== undefined ? { fittingDate: data.fittingDate } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.fitIssues !== undefined ? { fitIssues: data.fitIssues || null } : {}),
          ...(data.requiredAdjustments !== undefined ? { requiredAdjustments: data.requiredAdjustments || null } : {}),
          ...(data.designerComments !== undefined ? { designerComments: data.designerComments || null } : {}),
          ...(data.customerComments !== undefined ? { customerComments: data.customerComments || null } : {}),
          ...(data.photos !== undefined ? { photos: data.photos } : {}),
        },
        include: { alterations: { orderBy: { createdAt: "desc" } } },
      });

      if (data.status === "COMPLETED" || data.status === "APPROVED") {
        await markOrderTimelineStage(tx, {
          orderId: id,
          businessId,
          stage: "FITTING_COMPLETED",
          status: "COMPLETED",
          actorId: session.user.id,
        });
      }

      return updated;
    });

    await logOrderActivity(prisma, {
      orderId: id,
      businessId,
      type: "FITTING_COMPLETED",
      title: "Fitting session updated",
      previousValue: existing.status,
      newValue: fittingSession.status,
      actorId: session.user.id,
    });

    return NextResponse.json({ fittingSession });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
