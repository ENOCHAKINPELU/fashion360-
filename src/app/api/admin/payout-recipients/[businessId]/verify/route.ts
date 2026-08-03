import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { setPayoutRecipientKycStatus } from "@/lib/payout-recipients";

const schema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  note: z.string().trim().optional(),
});

// No real KYC provider is integrated in this environment — this records an
// authorized admin's manual confirmation that the bank details on file are
// correct, the same honest manual-record-keeping pattern lib/payout.ts's
// processPayout uses for offline-settled payouts.
export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    const { session } = await requireSuperAdmin();
    const data = schema.parse(await req.json());

    const recipient = await prisma.$transaction((tx) =>
      setPayoutRecipientKycStatus(tx, { businessId, status: data.status, note: data.note, actorId: session.user.id })
    );

    return NextResponse.json({ recipient });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
