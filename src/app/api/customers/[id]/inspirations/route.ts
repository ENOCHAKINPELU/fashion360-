import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { customerInspirationSchema } from "@/lib/validations/design";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({ where: { id, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const inspirations = await prisma.customerInspiration.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      include: { images: { orderBy: { sortOrder: "asc" } }, relatedDesign: { select: { id: true, name: true, mainImageUrl: true } } },
    });

    return NextResponse.json({ inspirations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({ where: { id, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const data = customerInspirationSchema.parse(await req.json());

    const inspiration = await prisma.customerInspiration.create({
      data: {
        businessId,
        customerId: id,
        relatedDesignId: data.relatedDesignId || null,
        source: data.source,
        designerNotes: data.designerNotes || null,
        images: { create: data.images.map((url, index) => ({ url, sortOrder: index })) },
      },
      include: { images: { orderBy: { sortOrder: "asc" } }, relatedDesign: { select: { id: true, name: true, mainImageUrl: true } } },
    });

    return NextResponse.json({ inspiration }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
