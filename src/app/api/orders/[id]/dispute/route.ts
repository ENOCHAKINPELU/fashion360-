import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId } = await requireBusinessContext();
    const dispute = await prisma.dispute.findFirst({
      where: { orderId: id, businessId },
      orderBy: { createdAt: "desc" },
      include: {
        evidence: { orderBy: { createdAt: "asc" } },
        responses: { orderBy: { createdAt: "asc" } },
        resolution: { include: { refund: true, resolvedBy: { select: { name: true } } } },
      },
    });
    return NextResponse.json({ dispute });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
