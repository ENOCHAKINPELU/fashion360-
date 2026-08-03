import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { createDeliveryForOrder } from "@/lib/delivery";

const schema = z.object({
  provider: z.enum(["MOCK", "MANUAL"]),
  pickupAddress: z.string().trim().min(1, "Pickup address is required"),
  deliveryAddress: z.string().trim().min(1, "Delivery address is required"),
  customerContactName: z.string().optional(),
  customerContactPhone: z.string().optional(),
  packageDescription: z.string().optional(),
  packageWeightKg: z.coerce.number().min(0).optional(),
  packageDimensions: z.string().optional(),
  manualTrackingNumber: z.string().optional(),
  manualCourierName: z.string().optional(),
  manualCourierPhone: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId, session } = await requireBusinessContext();
    const data = schema.parse(await req.json());

    const delivery = await prisma.$transaction((tx) =>
      createDeliveryForOrder(tx, {
        orderId: id,
        businessId,
        provider: data.provider,
        pickupAddress: data.pickupAddress,
        deliveryAddress: data.deliveryAddress,
        customerContactName: data.customerContactName,
        customerContactPhone: data.customerContactPhone,
        packageDescription: data.packageDescription,
        packageWeightKg: data.packageWeightKg,
        packageDimensions: data.packageDimensions,
        manualTrackingNumber: data.manualTrackingNumber,
        manualCourierName: data.manualCourierName,
        manualCourierPhone: data.manualCourierPhone,
        actorId: session.user.id,
      })
    );

    return NextResponse.json({ delivery }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
