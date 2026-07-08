import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { orderSchema } from "@/lib/validations/order";
import { generateNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const stage = req.nextUrl.searchParams.get("stage");
    const customerId = req.nextUrl.searchParams.get("customerId");

    const orders = await prisma.order.findMany({
      where: {
        businessId,
        ...(stage ? { stage: stage as never } : {}),
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const body = await req.json();
    const data = orderSchema.parse(body);

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, businessId },
    });
    if (!customer) throw new ApiError(404, "Customer not found");

    const order = await prisma.order.create({
      data: {
        businessId,
        customerId: data.customerId,
        measurementId: data.measurementId || null,
        designId: data.designId || null,
        orderNumber: generateNumber("ORD"),
        stage: data.stage,
        requiredStages: data.requiredStages,
        inspirationImages: data.inspirationImages,
        notes: data.notes,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        fabric: data.fabric,
        color: data.color,
        neckline: data.neckline,
        sleeveStyle: data.sleeveStyle,
        length: data.length,
        buttons: data.buttons,
        accessories: data.accessories,
        embroidery: data.embroidery,
        customNotes: data.customNotes,
        price: data.price,
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
