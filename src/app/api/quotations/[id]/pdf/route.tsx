import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { QuotationPdf } from "@/lib/pdf/quotation-pdf";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const [quotation, business] = await Promise.all([
      prisma.quotation.findFirst({
        where: { id, businessId },
        include: { customer: { select: { name: true, email: true, phone: true } } },
      }),
      prisma.business.findUnique({ where: { id: businessId } }),
    ]);
    if (!quotation || !business) throw new ApiError(404, "Quotation not found");

    const buffer = await renderToBuffer(
      <QuotationPdf
        businessName={business.name}
        currency={business.currency}
        quotation={JSON.parse(JSON.stringify(quotation))}
      />,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${quotation.quoteNumber}.pdf"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
