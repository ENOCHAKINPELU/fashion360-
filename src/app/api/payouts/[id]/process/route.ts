import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireSuperAdmin } from "@/lib/rbac";
import { processPayout } from "@/lib/payout";

const schema = z.object({
  status: z.enum(["PROCESSING", "PAID", "FAILED"]),
  providerReference: z.string().optional(),
  failureReason: z.string().optional(),
});

// Part 25: advancing a payout is a platform (Fashion360), not a business,
// action — a business can't be trusted to self-declare it received its own
// payout. No live payout-gateway integration exists in this environment (no
// transfer/recipient API credentials for any provider), so this is the
// honest, manual-record-keeping equivalent of Payment.MANUAL: an
// authorized admin marks the real-world transfer they just made.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const data = schema.parse(await req.json());

    const payout = await prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new ApiError(404, "Payout not found");

    const updated = await prisma.$transaction((tx) =>
      processPayout(tx, {
        payoutId: id,
        businessId: payout.businessId,
        status: data.status,
        providerReference: data.providerReference,
        failureReason: data.failureReason,
        actorId: session.user.id,
      })
    );

    return NextResponse.json({ payout: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
