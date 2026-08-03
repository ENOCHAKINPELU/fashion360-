import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerQuotation } from "@/lib/quotation-project";
import { buildQuotationPdfBuffer } from "@/lib/pdf/quotation-pdf-builder";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    await loadCustomerQuotation(id, profile.id);

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
