import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { InvoicePdf } from "@/lib/pdf/invoice-pdf";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const [invoice, business] = await Promise.all([
      prisma.invoice.findFirst({
        where: { id, businessId },
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          payments: true,
        },
      }),
      prisma.business.findUnique({ where: { id: businessId } }),
    ]);
    if (!invoice || !business) throw new ApiError(404, "Invoice not found");

    const buffer = await renderToBuffer(
      <InvoicePdf
        businessName={business.name}
        currency={business.currency}
        invoice={JSON.parse(JSON.stringify(invoice))}
      />,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
