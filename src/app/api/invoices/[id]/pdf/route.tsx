import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { getScopedInvoice } from "@/app/api/invoices/[id]/route";
import { buildInvoicePdfBuffer } from "@/lib/pdf/invoice-pdf-builder";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedInvoice(businessId, id);

    const { buffer, invoiceNumber } = await buildInvoicePdfBuffer(id);
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
