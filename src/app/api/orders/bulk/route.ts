import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { orderBulkActionSchema } from "@/lib/validations/order";
import { logOrderActivity } from "@/lib/order-activity";

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = orderBulkActionSchema.parse(await req.json());

    const orders = await prisma.order.findMany({ where: { id: { in: data.ids }, businessId } });
    const isArchived = data.action === "archive";

    await prisma.order.updateMany({
      where: { id: { in: orders.map((o) => o.id) } },
      data: { isArchived, archivedAt: isArchived ? new Date() : null },
    });

    await Promise.all(
      orders.map((order) =>
        logOrderActivity(prisma, {
          orderId: order.id,
          businessId,
          type: isArchived ? "ORDER_ARCHIVED" : "ORDER_UPDATED",
          title: isArchived ? "Order archived" : "Order restored from archive",
          actorId: session.user.id,
        })
      )
    );

    return NextResponse.json({ ok: true, count: orders.length });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
