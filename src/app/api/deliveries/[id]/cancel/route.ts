import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { resolveLogisticsProvider } from "@/lib/logistics-providers";
import { recordDeliveryEvent } from "@/lib/delivery";

const schema = z.object({ reason: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId, session } = await requireBusinessContext();
    const data = schema.parse(await req.json().catch(() => ({})));

    const delivery = await prisma.delivery.findFirst({ where: { id, businessId } });
    if (!delivery) throw new ApiError(404, "Delivery not found");
    if (delivery.status === "DELIVERED") throw new ApiError(400, "A delivered shipment can't be cancelled");

    if (delivery.provider !== "MANUAL" && delivery.providerDeliveryId) {
      const connection = await prisma.logisticsProviderConnection.findFirst({
        where: { businessId, provider: delivery.provider, isActive: true, status: "CONNECTED" },
      });
      if (connection) {
        const providerInstance = resolveLogisticsProvider(connection);
        await providerInstance.cancelShipment(delivery.providerDeliveryId);
      }
    }

    const updated = await prisma.$transaction((tx) =>
      recordDeliveryEvent(tx, {
        deliveryId: id,
        businessId,
        type: "CANCELLED",
        status: "CANCELLED",
        description: data.reason ?? "Shipment cancelled",
        actorType: "STAFF",
        actorId: session.user.id,
      })
    );

    return NextResponse.json({ delivery: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
