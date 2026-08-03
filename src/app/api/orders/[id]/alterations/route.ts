import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { alterationSchema } from "@/lib/validations/order";
import { logOrderActivity } from "@/lib/order-activity";
import { markOrderTimelineStage } from "@/lib/order-timeline";
import { getScopedOrder } from "@/app/api/orders/[id]/route";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedOrder(businessId, id);

    const alterations = await prisma.alteration.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ alterations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    await getScopedOrder(businessId, id);

    const data = alterationSchema.parse(await req.json());

    const priorCount = await prisma.alteration.count({ where: { orderId: id } });

    const alteration = await prisma.$transaction(async (tx) => {
      const created = await tx.alteration.create({
        data: {
          orderId: id,
          businessId,
          fittingSessionId: data.fittingSessionId || null,
          issue: data.issue,
          requiredChange: data.requiredChange,
          description: data.description || null,
          expectedCompletionDate: data.expectedCompletionDate,
          notes: data.notes || null,
          cycleNumber: priorCount + 1,
          createdById: session.user.id,
        },
      });

      await markOrderTimelineStage(tx, {
        orderId: id,
        businessId,
        stage: "ALTERATION_REQUIRED",
        status: "COMPLETED",
        actorId: session.user.id,
      });
      await tx.order.update({ where: { id }, data: { status: "ALTERATION", currentStage: "Alteration" } });

      return created;
    });

    await logOrderActivity(prisma, {
      orderId: id,
      businessId,
      type: "ALTERATION_ADDED",
      title: `Alteration requested (cycle ${alteration.cycleNumber})`,
      description: alteration.issue,
      actorId: session.user.id,
    });

    return NextResponse.json({ alteration }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
