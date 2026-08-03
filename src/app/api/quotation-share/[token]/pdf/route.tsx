import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/rbac";
import { getQuotationShareOrThrow } from "@/lib/quotation-share";
import { buildQuotationPdfBuffer } from "@/lib/pdf/quotation-pdf-builder";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getQuotationShareOrThrow(token);

    const { buffer, quotationNumber } = await buildQuotationPdfBuffer(share.quotation.id);
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
