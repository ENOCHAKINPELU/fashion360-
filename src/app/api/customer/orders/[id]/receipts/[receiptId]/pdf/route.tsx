import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerOrder } from "@/lib/order-access";
import { buildReceiptPdfBuffer } from "@/lib/pdf/receipt-pdf-builder";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; receiptId: string }> }) {
  try {
    const { id, receiptId } = await params;
    const { profile } = await requireCustomerContext();
    await loadCustomerOrder(id, profile.id);

    const receipt = await prisma.receipt.findFirst({ where: { id: receiptId, payment: { orderId: id } } });
    if (!receipt) throw new ApiError(404, "Receipt not found");

    const { buffer, receiptNumber } = await buildReceiptPdfBuffer(receiptId);
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
