import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { confirmCustomerDelivery, attemptAutomaticPayoutRelease } from "@/lib/payout";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const { delivery, payoutId } = await prisma.$transaction((tx) => confirmCustomerDelivery(tx, { orderId: id, customerProfileId: profile.id }));
    // Outside the transaction on purpose — attemptAutomaticPayoutRelease can
    // fire a real Flutterwave transfer, which must never run inside an open
    // DB transaction. See lib/payout.ts's own comment on why.
    if (payoutId) await attemptAutomaticPayoutRelease(prisma, { payoutId });
    return NextResponse.json({ delivery });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
