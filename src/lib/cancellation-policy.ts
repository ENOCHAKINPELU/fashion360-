import type { Order, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreatePlatformSettings } from "@/lib/platform-settings";
import { ApiError } from "@/lib/rbac";
import { PRODUCTION_STARTED_STATUSES, QUALITY_CHECK_STATUSES, DELIVERED_STATUSES } from "@/lib/customer-journey";

type Db = typeof prisma | Prisma.TransactionClient;

export type CancellationStage = "before_payment" | "before_production" | "during_production" | "after_production";

// Part 36: cancellation policy by order stage — never hard-coded into the
// frontend, always read from the platform's own (admin-configurable)
// settings, so changing the policy never requires a code change or deploy.
// "After delivery" isn't a stage here at all: once DELIVERED_STATUSES is
// reached, cancellation is refused outright and the dispute/refund process
// (lib/dispute.ts) is the only path back to a refund, per the same Part 36
// rule already encoded in PlatformSettings' schema comment.
export function classifyCancellationStage(order: Pick<Order, "status" | "paymentStatus">): CancellationStage {
  if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_PAID") return "before_payment";
  if (DELIVERED_STATUSES.has(order.status)) {
    throw new ApiError(400, "This order has already been delivered, use the dispute/refund process instead of cancellation");
  }
  if (QUALITY_CHECK_STATUSES.has(order.status)) return "after_production";
  if (PRODUCTION_STARTED_STATUSES.has(order.status)) return "during_production";
  return "before_production";
}

export async function evaluateCancellationPolicy(db: Db, order: Pick<Order, "status" | "paymentStatus" | "amountPaid">) {
  const stage = classifyCancellationStage(order);

  if (stage === "before_payment") {
    return { stage, refundPercent: 100, refundAmount: 0 };
  }

  const settings = await getOrCreatePlatformSettings(db);
  const percent =
    stage === "before_production"
      ? settings.cancellationRefundBeforeProductionPercent
      : stage === "during_production"
        ? settings.cancellationRefundDuringProductionPercent
        : settings.cancellationRefundAfterProductionPercent;

  const refundAmount = Math.round(order.amountPaid * (percent / 100) * 100) / 100;
  return { stage, refundPercent: percent, refundAmount };
}
