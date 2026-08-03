import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const payment = await prisma.payment.findFirst({
      where: { id, businessId },
      include: {
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
        receipt: true,
        refunds: true,
        recordedBy: { select: { name: true } },
      },
    });
    if (!payment) throw new ApiError(404, "Payment not found");

    return NextResponse.json({ payment });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
