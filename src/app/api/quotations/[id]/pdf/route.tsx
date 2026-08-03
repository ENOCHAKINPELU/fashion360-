import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { getScopedQuotation } from "@/app/api/quotations/[id]/route";
import { buildQuotationPdfBuffer } from "@/lib/pdf/quotation-pdf-builder";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedQuotation(businessId, id);

    const { buffer, quotationNumber } = await buildQuotationPdfBuffer(id);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quotation-${quotationNumber}.pdf"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
