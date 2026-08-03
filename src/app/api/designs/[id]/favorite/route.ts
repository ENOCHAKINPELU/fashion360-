import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { z } from "zod";

const schema = z.object({ customerId: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const design = await prisma.design.findFirst({ where: { id, businessId } });
    if (!design) throw new ApiError(404, "Design not found");

    const { customerId } = schema.parse(await req.json());

    const customer = await prisma.customer.findFirst({ where: { id: customerId, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const existing = await prisma.designFavorite.findUnique({
      where: { designId_customerId: { designId: id, customerId } },
    });

    if (existing) {
      await prisma.designFavorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ favorited: false });
    }

    await prisma.designFavorite.create({ data: { businessId, designId: id, customerId } });
    return NextResponse.json({ favorited: true }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
