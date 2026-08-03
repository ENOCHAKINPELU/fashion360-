import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { paymentLinkSchema } from "@/lib/validations/invoice";
import { createInvoicePaymentLink } from "@/lib/payment-link";
import { getScopedInvoice } from "@/app/api/invoices/[id]/route";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedInvoice(businessId, id);

    const data = paymentLinkSchema.parse(await req.json().catch(() => ({})));
    const callbackUrl = new URL(`/dashboard/invoices/${id}`, req.nextUrl.origin).toString();

    const link = await createInvoicePaymentLink(prisma, {
      businessId,
      invoiceId: id,
      callbackUrl,
      milestoneId: data.milestoneId,
    });

    return NextResponse.json(link);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
