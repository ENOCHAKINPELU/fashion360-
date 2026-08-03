import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId } = await requireBusinessContext();
    const payout = await prisma.payout.findFirst({
      where: { id, businessId },
      include: {
        order: { select: { id: true, orderCode: true, customer: { select: { firstName: true, lastName: true } } } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!payout) throw new ApiError(404, "Payout not found");
    return NextResponse.json({ payout });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
