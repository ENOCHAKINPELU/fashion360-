import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireSuperAdmin } from "@/lib/rbac";
import { resolveDispute } from "@/lib/dispute";
import { attemptAutomaticPayoutRelease } from "@/lib/payout";
import { logAuditEvent } from "@/lib/audit-log";

const schema = z.object({
  resolutionType: z.enum(["RELEASE_FULL_PAYMENT", "PARTIAL_REFUND", "FULL_REFUND", "REWORK_REQUIRED", "RETURN_REQUIRED", "CANCEL_ORDER"]),
  notes: z.string().trim().min(1, "Explain the resolution"),
  refundAmount: z.coerce.number().min(0).optional(),
  paymentId: z.string().optional(),
});

// Platform-level dispute resolution — the same decision a business can make
// on its own dispute (lib/dispute.ts's resolveDispute), but authorized as a
// Fashion360 admin action instead, for disputes escalated to the platform.
// Payout stays blocked until one of these explicit decisions is recorded
// (Part 22-23).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const data = schema.parse(await req.json());

    const dispute = await prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw new ApiError(404, "Dispute not found");

    const { resolution, payoutId } = await prisma.$transaction((tx) =>
      resolveDispute(tx, {
        disputeId: id,
        businessId: dispute.businessId,
        resolutionType: data.resolutionType,
        notes: data.notes,
        refundAmount: data.refundAmount,
        paymentId: data.paymentId,
        resolvedById: session.user.id,
      })
    );
    // Outside the transaction on purpose — see lib/payout.ts's
    // attemptAutomaticPayoutRelease comment.
    if (payoutId) await attemptAutomaticPayoutRelease(prisma, { payoutId });

    await logAuditEvent(prisma, {
      action: "DISPUTE_RESOLVED_BY_ADMIN",
      userId: session.user.id,
      businessId: dispute.businessId,
      entityType: "Dispute",
      entityId: id,
      metadata: { resolutionType: data.resolutionType, notes: data.notes },
    });

    return NextResponse.json({ resolution }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
