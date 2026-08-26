import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { processAdminRefund } from "@/lib/admin-payments";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  type: z.enum(["FULL", "PARTIAL"]),
  reason: z.string().trim().min(1, "A reason is required"),
});

// [id] is Payment.id. Routes through lib/refund-processing.ts's
// initiateRefundForPayment — the same platform-aware refund path dispute
// resolution already uses — never a second, admin-only refund mechanism.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const { amount, type, reason } = schema.parse(await req.json());

    const refund = await processAdminRefund(prisma, { paymentId: id, amount, type, reason, actorId: session.user.id });

    return NextResponse.json({ refund });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
