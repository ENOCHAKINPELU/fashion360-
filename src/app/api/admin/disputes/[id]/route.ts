import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireSuperAdmin } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireSuperAdmin();
    const { id } = await params;

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        business: { select: { id: true, name: true } },
        order: { select: { id: true, orderCode: true, totalValue: true, amountPaid: true } },
        customer: { select: { firstName: true, lastName: true, email: true } },
        evidence: { orderBy: { createdAt: "asc" } },
        responses: { orderBy: { createdAt: "asc" } },
        resolution: { include: { refund: true } },
      },
    });
    if (!dispute) throw new ApiError(404, "Dispute not found");

    // Reviewing a dispute is itself an auditable admin action (Part 23) —
    // even before any decision is made, so there's a record of who looked at it.
    await logAuditEvent(prisma, {
      action: "DISPUTE_REVIEWED",
      userId: session.user.id,
      businessId: dispute.businessId,
      entityType: "Dispute",
      entityId: dispute.id,
    });

    return NextResponse.json({ dispute });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
