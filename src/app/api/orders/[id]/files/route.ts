import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { orderFileSchema } from "@/lib/validations/order";
import { logOrderActivity } from "@/lib/order-activity";
import { getScopedOrder } from "@/app/api/orders/[id]/route";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedOrder(businessId, id);

    const files = await prisma.orderFile.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { name: true } } },
    });

    return NextResponse.json({ files });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    await getScopedOrder(businessId, id);

    const data = orderFileSchema.parse(await req.json());

    const file = await prisma.orderFile.create({
      data: {
        orderId: id,
        businessId,
        category: data.category,
        url: data.url,
        name: data.name,
        fileType: data.fileType,
        sizeBytes: data.sizeBytes,
        productionStageId: data.productionStageId || null,
        uploadedById: session.user.id,
      },
      include: { uploadedBy: { select: { name: true } } },
    });

    await logOrderActivity(prisma, {
      orderId: id,
      businessId,
      type: "FILE_UPLOADED",
      title: `File uploaded: ${data.name}`,
      actorId: session.user.id,
    });

    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
