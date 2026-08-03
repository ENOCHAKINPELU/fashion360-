import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId } = await requireBusinessContext();
    const delivery = await prisma.delivery.findFirst({ where: { id, businessId } });
    if (!delivery) throw new ApiError(404, "Delivery not found");

    const events = await prisma.deliveryEvent.findMany({ where: { deliveryId: id }, orderBy: { occurredAt: "asc" } });
    return NextResponse.json({
      status: delivery.status,
      trackingNumber: delivery.trackingNumber,
      trackingUrl: delivery.trackingUrl,
      estimatedDeliveryDate: delivery.estimatedDeliveryDate,
      events,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
