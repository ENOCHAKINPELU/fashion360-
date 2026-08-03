import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { alterationUpdateSchema } from "@/lib/validations/order";
import { logOrderActivity } from "@/lib/order-activity";
import { getScopedOrder } from "@/app/api/orders/[id]/route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; alterationId: string }> }
) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id, alterationId } = await params;
    await getScopedOrder(businessId, id);

    const existing = await prisma.alteration.findFirst({ where: { id: alterationId, orderId: id } });
    if (!existing) throw new ApiError(404, "Alteration not found");

    const data = alterationUpdateSchema.parse(await req.json());

    const alteration = await prisma.alteration.update({
      where: { id: alterationId },
      data: {
        ...(data.status !== undefined
          ? { status: data.status, completedAt: data.status === "COMPLETED" ? new Date() : undefined }
          : {}),
        ...(data.requiredChange !== undefined ? { requiredChange: data.requiredChange } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.expectedCompletionDate !== undefined ? { expectedCompletionDate: data.expectedCompletionDate } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    });

    await logOrderActivity(prisma, {
      orderId: id,
      businessId,
      type: "ALTERATION_UPDATED",
      title: `Alteration cycle ${alteration.cycleNumber} updated`,
      previousValue: existing.status,
      newValue: alteration.status,
      actorId: session.user.id,
    });

    return NextResponse.json({ alteration });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
