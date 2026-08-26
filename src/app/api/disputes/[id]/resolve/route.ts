import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessPermission } from "@/lib/rbac";
import { resolveDispute } from "@/lib/dispute";
import { attemptAutomaticPayoutRelease } from "@/lib/payout";

const schema = z.object({
  resolutionType: z.enum(["RELEASE_FULL_PAYMENT", "PARTIAL_REFUND", "FULL_REFUND", "REWORK_REQUIRED", "RETURN_REQUIRED", "CANCEL_ORDER"]),
  notes: z.string().trim().min(1, "Explain the resolution"),
  refundAmount: z.coerce.number().min(0).optional(),
  paymentId: z.string().optional(),
});

// Part 23: an explicit, authorized decision only — never automatic.
// requireBusinessPermission mirrors the same "MANAGE_PAYMENTS"-style gate
// refunds already use, since a resolution can move real money.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId, session } = await requireBusinessPermission("MANAGE_PAYMENTS");
    const data = schema.parse(await req.json());

    const { resolution, payoutId } = await prisma.$transaction((tx) =>
      resolveDispute(tx, {
        disputeId: id,
        businessId,
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

    return NextResponse.json({ resolution }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
