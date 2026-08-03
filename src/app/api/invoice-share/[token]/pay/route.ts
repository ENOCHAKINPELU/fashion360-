import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { paymentLinkSchema } from "@/lib/validations/invoice";
import { getInvoiceShareOrThrow } from "@/lib/invoice-share";
import { createInvoicePaymentLink } from "@/lib/payment-link";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

// Public, unauthenticated (token-only) route — rate-limited per IP+token so
// it can't be used to hammer a provider's initialize-payment API or as a
// token-guessing oracle.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(`pay-init:${ip}:${token}`, 15, 15 * 60 * 1000);
    if (!allowed) throw new ApiError(429, "Too many payment attempts. Please try again shortly.");

    const share = await getInvoiceShareOrThrow(token);
    const invoice = share.invoice;

    const data = paymentLinkSchema.parse(await req.json().catch(() => ({})));
    const callbackUrl = new URL(`/invoice-pay/${token}`, req.nextUrl.origin).toString();

    const link = await createInvoicePaymentLink(prisma, {
      businessId: invoice.businessId,
      invoiceId: invoice.id,
      callbackUrl,
      milestoneId: data.milestoneId,
    });

    return NextResponse.json(link);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
