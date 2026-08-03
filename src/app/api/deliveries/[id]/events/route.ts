import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { recordDeliveryEvent } from "@/lib/delivery";

const schema = z.object({
  status: z.enum(["COURIER_ASSIGNED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "CANCELLED", "RETURNED"]),
  description: z.string().optional(),
  location: z.string().optional(),
});

// Staff-driven status update — used for MANUAL deliveries (no courier API to
// push events) and to correct/supplement a connected provider's own webhook
// events.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId, session } = await requireBusinessContext();
    const data = schema.parse(await req.json());

    const delivery = await prisma.$transaction((tx) =>
      recordDeliveryEvent(tx, {
        deliveryId: id,
        businessId,
        type: data.status,
        status: data.status,
        description: data.description,
        location: data.location,
        actorType: "STAFF",
        actorId: session.user.id,
      })
    );

    return NextResponse.json({ delivery });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
