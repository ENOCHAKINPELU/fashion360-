import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { postProductionUpdate } from "@/lib/production";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().min(1, "Message is required"),
  photos: z.array(z.string()),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId } = await requireBusinessContext();
    const order = await prisma.order.findFirst({ where: { id, businessId } });
    if (!order) throw new ApiError(404, "Order not found");
    const updates = await prisma.productionUpdate.findMany({ where: { orderId: id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ updates });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId, session } = await requireBusinessContext();
    const data = schema.parse(await req.json());

    const update = await prisma.$transaction((tx) =>
      postProductionUpdate(tx, { orderId: id, businessId, title: data.title, body: data.body, photos: data.photos, createdById: session.user.id })
    );

    return NextResponse.json({ update }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
