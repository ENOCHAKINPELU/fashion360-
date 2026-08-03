import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId } = await requireBusinessContext();
    const delivery = await prisma.delivery.findFirst({
      where: { id, businessId },
      include: { events: { orderBy: { occurredAt: "desc" } }, order: { select: { id: true, orderCode: true } } },
    });
    if (!delivery) throw new ApiError(404, "Delivery not found");
    return NextResponse.json({ delivery });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
