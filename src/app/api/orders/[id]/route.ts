import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { orderSchema, ORDER_STAGES } from "@/lib/validations/order";

const DESIGN_FIELDS = [
  "designId",
  "fabric",
  "color",
  "neckline",
  "sleeveStyle",
  "length",
  "buttons",
  "accessories",
  "embroidery",
  "customNotes",
] as const;

const LOCKED_FROM_STAGE_INDEX = ORDER_STAGES.indexOf("PRODUCTION");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: { id, businessId },
      include: {
        customer: true,
        measurement: true,
        design: true,
        designApprovals: { orderBy: { createdAt: "desc" } },
        delivery: true,
      },
    });
    if (!order) throw new ApiError(404, "Order not found");

    return NextResponse.json({ order });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.order.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Order not found");

    const body = await req.json();
    const data = orderSchema.partial().parse(body);

    const currentStageIndex = ORDER_STAGES.indexOf(existing.stage);
    const editsDesign = DESIGN_FIELDS.some((f) => f in body);
    if (editsDesign && currentStageIndex >= LOCKED_FROM_STAGE_INDEX) {
      throw new ApiError(400, "Design is locked once production has started");
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...data,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      },
    });

    return NextResponse.json({ order });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.order.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Order not found");

    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
