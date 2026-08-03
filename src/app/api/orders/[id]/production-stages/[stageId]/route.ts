import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { productionStageUpdateSchema } from "@/lib/validations/order";
import { logOrderActivity } from "@/lib/order-activity";
import { markOrderTimelineStage } from "@/lib/order-timeline";
import { notifyCustomer } from "@/lib/service-request-notify";
import { getScopedOrder } from "@/app/api/orders/[id]/route";

// A production-stage name maps 1:1 to an OrderTimelineStage for the default
// system stages, so completing "Sewing" here also advances the customer's
// timeline view — best-effort only (custom, non-default stage names simply
// don't have a matching timeline entry and are skipped).
const STAGE_NAME_TO_TIMELINE: Record<string, "CUTTING" | "SEWING" | "FINISHING" | "FITTING_SCHEDULED" | "FINAL_INSPECTION" | "COMPLETED"> = {
  "Pattern / Cutting": "CUTTING",
  Sewing: "SEWING",
  Finishing: "FINISHING",
  Fitting: "FITTING_SCHEDULED",
  "Final Inspection": "FINAL_INSPECTION",
  Completed: "COMPLETED",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id, stageId } = await params;
    const order = await getScopedOrder(businessId, id);

    const existingStage = await prisma.orderProductionStage.findFirst({ where: { id: stageId, orderId: id } });
    if (!existingStage) throw new ApiError(404, "Production stage not found");

    const data = productionStageUpdateSchema.parse(await req.json());

    // Part 6: a milestone can never be marked COMPLETED without a timestamp
    // — the update below always sets completionDate/completedById together
    // with status, so this is enforced by construction, not a separate check.
    const stage = await prisma.$transaction(async (tx) => {
      const updated = await tx.orderProductionStage.update({
        where: { id: stageId },
        data: {
          ...(data.status !== undefined
            ? {
                status: data.status,
                startDate: data.status === "IN_PROGRESS" && !existingStage.startDate ? new Date() : undefined,
                completionDate: data.status === "COMPLETED" ? new Date() : undefined,
                completedById: data.status === "COMPLETED" ? session.user.id : undefined,
              }
            : {}),
          ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
          ...(data.completionDate !== undefined ? { completionDate: data.completionDate } : {}),
          ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
          ...(data.photos !== undefined ? { photos: data.photos } : {}),
        },
        include: { files: { select: { id: true, url: true, name: true } } },
      });

      await logOrderActivity(tx, {
        orderId: id,
        businessId,
        type: "PRODUCTION_STAGE_UPDATED",
        title: `Production stage "${updated.name}" updated`,
        previousValue: existingStage.status,
        newValue: updated.status,
        actorId: session.user.id,
      });

      const timelineStage = STAGE_NAME_TO_TIMELINE[updated.name];
      if (timelineStage && data.status) {
        await markOrderTimelineStage(tx, {
          orderId: id,
          businessId,
          stage: timelineStage,
          status: data.status,
          actorId: session.user.id,
        });
      }

      return updated;
    });

    // Part 30: "Production Milestone Updated" — only fired on completion,
    // not every intermediate status tweak, to avoid noise.
    if (data.status === "COMPLETED" && order.customerProfileId) {
      await notifyCustomer(prisma, {
        businessId,
        customerProfileId: order.customerProfileId,
        title: "Production milestone completed",
        body: `"${stage.name}" is done for order ${order.orderCode}.`,
        type: "info",
      });
    }

    return NextResponse.json({ stage });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
