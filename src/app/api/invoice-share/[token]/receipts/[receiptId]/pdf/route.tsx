import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { getInvoiceShareOrThrow } from "@/lib/invoice-share";
import { buildReceiptPdfBuffer } from "@/lib/pdf/receipt-pdf-builder";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string; receiptId: string }> }) {
  try {
    const { token, receiptId } = await params;
    const share = await getInvoiceShareOrThrow(token);

    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, payment: { invoiceId: share.invoice.id } },
    });
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
