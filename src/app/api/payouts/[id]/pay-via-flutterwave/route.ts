import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireSuperAdmin } from "@/lib/rbac";
import { executePayoutTransfer } from "@/lib/payout";

// The real payout button — fires an actual Flutterwave transfer, replacing
// the manual "I paid this outside the platform" record for any business
// with a verified bank account on file. See lib/payout.ts.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();

    const payout = await prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new ApiError(404, "Payout not found");

    const updated = await executePayoutTransfer(prisma, { payoutId: id, businessId: payout.businessId, actorId: session.user.id });

    return NextResponse.json({ payout: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
