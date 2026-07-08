import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { InvoicePdf } from "@/lib/pdf/invoice-pdf";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireCustomerContext();
    const { id } = await params;

    const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
    if (!customer) throw new ApiError(404, "No customer profile linked to this account");

    const invoice = await prisma.invoice.findFirst({
      where: { id, customerId: customer.id },
      include: { customer: { select: { name: true, email: true, phone: true } }, payments: true },
    });
    if (!invoice) throw new ApiError(404, "Invoice not found");

    const business = await prisma.business.findUnique({ where: { id: customer.businessId } });
    if (!business) throw new ApiError(404, "Business not found");

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
