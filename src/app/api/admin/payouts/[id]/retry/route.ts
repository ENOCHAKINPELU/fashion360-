import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { retryPayoutByAdmin } from "@/lib/admin-payments";
import { prisma } from "@/lib/prisma";

const schema = z.object({ reason: z.string().trim().min(1, "A reason is required") });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const { reason } = schema.parse(await req.json());

    const payout = await retryPayoutByAdmin(prisma, { payoutId: id, reason, actorId: session.user.id });

    return NextResponse.json({ payout });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
