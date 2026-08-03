import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { buildReceiptPdfBuffer } from "@/lib/pdf/receipt-pdf-builder";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const receipt = await prisma.receipt.findFirst({ where: { id, businessId } });
    if (!receipt) throw new ApiError(404, "Receipt not found");

    const { buffer, receiptNumber } = await buildReceiptPdfBuffer(id);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${receiptNumber}.pdf"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
