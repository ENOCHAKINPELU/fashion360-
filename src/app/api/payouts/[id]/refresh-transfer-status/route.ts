import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireSuperAdmin } from "@/lib/rbac";
import { refreshTransferStatus } from "@/lib/payout";

// Checks a PROCESSING payout's real Flutterwave transfer status and
// advances it to PAID/FAILED once confirmed. Admin-triggered for now — no
// webhook listener exists yet for transfer events (see lib/payout.ts).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();

    const payout = await prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new ApiError(404, "Payout not found");

    const result = await refreshTransferStatus(prisma, { payoutId: id, businessId: payout.businessId, actorId: session.user.id });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
