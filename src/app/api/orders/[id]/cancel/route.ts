import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { orderCancellationSchema } from "@/lib/validations/order";
import { logOrderActivity } from "@/lib/order-activity";
import { markOrderTimelineStage } from "@/lib/order-timeline";
import { getScopedOrder } from "@/app/api/orders/[id]/route";
import { evaluateCancellationPolicy } from "@/lib/cancellation-policy";
import { initiateRefundForPayment } from "@/lib/refund-processing";
import { notifyCustomer } from "@/lib/service-request-notify";

const NON_CANCELLABLE_STATUSES = ["COMPLETED", "DELIVERED", "CANCELLED"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const existing = await getScopedOrder(businessId, id);

    if (NON_CANCELLABLE_STATUSES.includes(existing.status)) {
      throw new ApiError(400, `A ${existing.status.toLowerCase()} order cannot be cancelled`);
    }

    const data = orderCancellationSchema.parse(await req.json());

    // Part 36: the refund percentage is computed server-side from the
    // platform's configurable cancellation policy, never accepted from the
    // client — see lib/cancellation-policy.ts. Throws if the order has
    // already been delivered (dispute/refund process applies instead).
    const policy = await evaluateCancellationPolicy(prisma, existing);

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: "CANCELLED", currentStage: "Cancelled" },
      });

      await tx.orderCancellation.create({
        data: {
          orderId: id,
          businessId,
          reason: data.reason,
          cancelledById: session.user.id,
          refundEligible: policy.refundAmount > 0,
          refundStatus: policy.refundAmount > 0 ? "INITIATED" : "NOT_APPLICABLE",
        },
      });

      await markOrderTimelineStage(tx, {
        orderId: id,
        businessId,
        stage: "CANCELLED",
        status: "COMPLETED",
        note: data.reason,
        actorId: session.user.id,
      });

      return updated;
    });

    await logOrderActivity(prisma, {
      orderId: id,
      businessId,
      type: "ORDER_CANCELLED",
      title: "Order cancelled",
      description: `${data.reason} (${policy.stage.replace(/_/g, " ")}, ${policy.refundPercent}% refund policy)`,
      previousValue: existing.status,
      newValue: "CANCELLED",
      actorId: session.user.id,
    });

    if (existing.customerProfileId) {
      await notifyCustomer(prisma, {
        businessId,
        customerProfileId: existing.customerProfileId,
        title: "Your order was cancelled",
        body:
          policy.refundAmount > 0
            ? `Order ${existing.orderCode} has been cancelled. A refund of ${policy.refundAmount} (${policy.refundPercent}% of what you paid) is being processed.`
            : `Order ${existing.orderCode} has been cancelled. Reason: ${data.reason}`,
        type: policy.refundAmount > 0 ? "info" : "warning",
      });
    }

    let refundInitiated = false;
    if (policy.refundAmount > 0) {
      const payment = await prisma.payment.findFirst({
        where: { orderId: id, status: "SUCCESSFUL" },
        orderBy: { paidAt: "desc" },
      });
      if (payment) {
        await prisma.$transaction((tx) =>
          initiateRefundForPayment(tx, {
            businessId,
            paymentId: payment.id,
            amount: Math.min(policy.refundAmount, payment.amount),
            type: policy.refundAmount >= existing.amountPaid - 0.01 ? "FULL" : "PARTIAL",
            reason: `Order cancelled: ${data.reason}`,
            processedById: session.user.id,
          })
        );
        refundInitiated = true;
      }
    }

    return NextResponse.json({ order, refund: { ...policy, refundInitiated } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
