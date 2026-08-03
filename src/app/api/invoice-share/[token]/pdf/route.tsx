import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/rbac";
import { getInvoiceShareOrThrow } from "@/lib/invoice-share";
import { buildInvoicePdfBuffer } from "@/lib/pdf/invoice-pdf-builder";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getInvoiceShareOrThrow(token);

    const { buffer, invoiceNumber } = await buildInvoicePdfBuffer(share.invoice.id);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
