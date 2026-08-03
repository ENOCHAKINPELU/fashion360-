import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; inspirationId: string }> }
) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id, inspirationId } = await params;

    const customer = await prisma.customer.findFirst({ where: { id, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const inspiration = await prisma.customerInspiration.findFirst({
      where: { id: inspirationId, customerId: id },
    });
    if (!inspiration) throw new ApiError(404, "Inspiration not found");

    await prisma.customerInspiration.delete({ where: { id: inspirationId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
