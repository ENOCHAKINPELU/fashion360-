import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { fittingSessionSchema } from "@/lib/validations/order";
import { logOrderActivity } from "@/lib/order-activity";
import { markOrderTimelineStage } from "@/lib/order-timeline";
import { getScopedOrder } from "@/app/api/orders/[id]/route";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedOrder(businessId, id);

    const fittingSessions = await prisma.fittingSession.findMany({
      where: { orderId: id },
      orderBy: { fittingDate: "desc" },
      include: { alterations: { orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json({ fittingSessions });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    await getScopedOrder(businessId, id);

    const data = fittingSessionSchema.parse(await req.json());

    const fittingSession = await prisma.$transaction(async (tx) => {
      const created = await tx.fittingSession.create({
        data: {
          orderId: id,
          businessId,
          fittingDate: data.fittingDate,
          status: data.status,
          fitIssues: data.fitIssues || null,
          requiredAdjustments: data.requiredAdjustments || null,
          designerComments: data.designerComments || null,
          customerComments: data.customerComments || null,
          photos: data.photos,
          createdById: session.user.id,
        },
      });

      await markOrderTimelineStage(tx, {
        orderId: id,
        businessId,
        stage: "FITTING_SCHEDULED",
        status: "COMPLETED",
        actorId: session.user.id,
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

      return created;
    });

    await logOrderActivity(prisma, {
      orderId: id,
      businessId,
      type: "FITTING_SCHEDULED",
      title: "Fitting session scheduled",
      description: fittingSession.fittingDate.toISOString(),
      actorId: session.user.id,
    });

    return NextResponse.json({ fittingSession }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
