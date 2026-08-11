import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerOrder } from "@/lib/order-access";
import { releaseIfWindowExpired } from "@/lib/payout";
import { ensureReviewReminderSent } from "@/lib/review-reminders";
import { getOrCreatePlatformSettings } from "@/lib/platform-settings";
import { pollFlutterwaveChargeStatus } from "@/lib/payment-link";

// Part 7: production stages are shown to the customer stripped of internal
// notes/photos (those are for the business only) — customer-facing updates
// with photos come through ProductionUpdate instead, which is customer-
// facing by construction.
const CUSTOMER_PRODUCTION_STAGE_SELECT = {
  id: true,
  name: true,
  status: true,
  startDate: true,
  completionDate: true,
  sortOrder: true,
} as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const order = await loadCustomerOrder(id, profile.id);

    await releaseIfWindowExpired(prisma, { orderId: id });
    await ensureReviewReminderSent(prisma, { orderId: id });

    const invoiceForPoll = await prisma.invoice.findFirst({ where: { orderId: id }, select: { id: true } });
    if (invoiceForPoll) await pollFlutterwaveChargeStatus(prisma, { invoiceId: invoiceForPoll.id });

    const [agreement, invoice, timeline, business, designPreview, assignedDesigner, productionStages, productionUpdates, delivery, dispute, qcSummary, review] =
      await Promise.all([
        prisma.orderAgreement.findUnique({ where: { orderId: id } }),
        prisma.invoice.findFirst({ where: { orderId: id } }),
        prisma.orderTimelineEntry.findMany({
          where: { orderId: id },
          orderBy: { sortOrder: "asc" },
          include: { actor: { select: { name: true } } },
        }),
        prisma.business.findUnique({ where: { id: order.businessId }, select: { id: true, name: true, logoUrl: true, currency: true } }),
        order.designPreviewId
          ? prisma.designPreview.findUnique({ where: { id: order.designPreviewId }, select: { id: true, name: true, previewCode: true } })
          : null,
        order.assignedDesignerId ? prisma.user.findUnique({ where: { id: order.assignedDesignerId }, select: { id: true, name: true } }) : null,
        prisma.orderProductionStage.findMany({ where: { orderId: id }, orderBy: { sortOrder: "asc" }, select: CUSTOMER_PRODUCTION_STAGE_SELECT }),
        prisma.productionUpdate.findMany({ where: { orderId: id }, orderBy: { createdAt: "desc" } }),
        prisma.delivery.findUnique({ where: { orderId: id } }),
        prisma.dispute.findFirst({ where: { orderId: id, customerProfileId: profile.id }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, issueType: true, createdAt: true } }),
        prisma.qualityControlChecklist.findFirst({ where: { orderId: id }, orderBy: { attemptNumber: "desc" }, select: { result: true, completedAt: true } }),
        prisma.review.findUnique({ where: { orderId: id }, select: { id: true, overallRating: true, status: true } }),
      ]);

    const payments = invoice
      ? await prisma.payment.findMany({ where: { invoiceId: invoice.id }, orderBy: { createdAt: "desc" }, include: { receipt: true } })
      : [];
    const platformSettings = await getOrCreatePlatformSettings(prisma);

    return NextResponse.json({
      order,
      agreement,
      invoice,
      payments,
      timeline,
      business,
      designPreview,
      assignedDesigner,
      productionStages,
      productionUpdates,
      delivery,
      dispute,
      qcSummary,
      review,
      platformFeePercentage: platformSettings.platformFeePercentage,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
