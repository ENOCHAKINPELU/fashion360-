import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { orderStatusUpdateSchema, orderStatusOptions } from "@/lib/validations/order";
import { logOrderActivity } from "@/lib/order-activity";
import { markOrderTimelineStage, STATUS_TIMELINE_STAGE } from "@/lib/order-timeline";
import { getScopedOrder } from "@/app/api/orders/[id]/route";
import { notifyCustomer } from "@/lib/service-request-notify";

const STATUS_LABEL = Object.fromEntries(orderStatusOptions.map((o) => [o.value, o.label]));

// Terminal states this endpoint won't move an order out of or into — CANCELLED
// requires the dedicated /cancel endpoint (it needs a reason), and DRAFT is
// only ever the order's starting point.
const LOCKED_FROM: string[] = ["CANCELLED"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const existing = await getScopedOrder(businessId, id);

    const data = orderStatusUpdateSchema.parse(await req.json());

    if (data.status === "CANCELLED") {
      throw new ApiError(400, "Use the cancel order action to cancel with a reason");
    }
    if (LOCKED_FROM.includes(existing.status)) {
      throw new ApiError(400, `Cannot change the status of a ${STATUS_LABEL[existing.status]} order`);
    }
    if (data.status === "DRAFT" && existing.status !== "DRAFT") {
      throw new ApiError(400, "An order cannot be moved back to Draft");
    }
    // Part 14: "production cannot begin before payment verification" — scoped
    // to platform-mediated orders (customerProfileId set) only, so no legacy
    // manually-tracked order workflow is affected.
    if (data.status === "IN_PRODUCTION" && existing.customerProfileId && existing.paymentStatus !== "PAID") {
      throw new ApiError(400, "This order's payment must be verified before production can start");
    }

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: data.status, currentStage: STATUS_LABEL[data.status] },
      });

      const timelineStage = STATUS_TIMELINE_STAGE[data.status];
      if (timelineStage) {
        await markOrderTimelineStage(tx, {
          orderId: id,
          businessId,
          stage: timelineStage,
          status: "COMPLETED",
          note: data.note,
          actorId: session.user.id,
        });
      }

      if (data.note) {
        await tx.orderNote.create({
          data: { orderId: id, category: "PRODUCTION", body: data.note, authorId: session.user.id },
        });
      }

      return updated;
    });

    await logOrderActivity(prisma, {
      orderId: id,
      businessId,
      type: "STATUS_CHANGED",
      title: `Status changed to ${STATUS_LABEL[data.status]}`,
      description: data.note,
      previousValue: STATUS_LABEL[existing.status],
      newValue: STATUS_LABEL[data.status],
      actorId: session.user.id,
    });

    if (existing.customerProfileId) {
      await notifyCustomer(prisma, {
        businessId,
        customerProfileId: existing.customerProfileId,
        title: "Order status updated",
        body: `Order ${existing.orderCode} is now ${STATUS_LABEL[data.status]}.`,
        type: "info",
      });
    }

    return NextResponse.json({ order });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
